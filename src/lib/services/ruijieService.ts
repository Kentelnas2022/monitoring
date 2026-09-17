/**
 * Ruijie Cloud Open API Synchronization Engine
 * Multifactors Sales Network Monitoring System
 *
 * Implements the official Ruijie Cloud API Reference Manual V2.0.3:
 * - OAuth 2.0 Token Generation: /service/api/oauth20/client/access_token?token=d63dss0a81e4415a889ac5b78fsc904a
 * - Organization & Account Info: /service/api/org/account/info
 * - Network Group Tree & Coordinates: /service/api/group/single/tree?depth=BUILDING
 * - Device Inventory & Telemetry: /service/api/maint/devices
 *
 * Configured Credentials:
 * - RUIJIE_BASE_URL: https://cloud-as.ruijienetworks.com
 * - RUIJIE_APP_ID: open1d9ecf635290
 * - RUIJIE_APP_SECRET: a5dfb884bd7847cf8f21d28088f48a7e
 */

import type { RowDataPacket } from 'mysql2/promise';
import { db, getDbPool } from '../db';

export interface RuijieSyncResult {
  success: boolean;
  message: string;
  syncedSites: number;
  syncedDevices: number;
  activeAlarms: number;
  newDowntimeEvents: number;
  resolvedEvents: number;
  mode: 'live_cloud' | 'cloud_telemetry';
  timestamp: string;
  account?: {
    company: string;
    account: string;
    userName: string;
    phone: string;
  };
}

// In-memory token cache
let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;

// Ruijie fixed token salt as defined in Reference Manual V2.0.3 section 2.1.1
const RUIJIE_TOKEN_SALT = 'd63dss0a81e4415a889ac5b78fsc904a';

interface RuijieTokenResponse {
  code: number;
  msg?: string;
  accessToken?: string;
  refreshToken?: string;
}

interface RuijieAccountResponse {
  code: number;
  company?: string;
  account?: string;
  userName?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

/**
 * Obtain an authentic OAuth 2.0 Access Token from Ruijie Cloud
 */
export async function getRuijieAccessToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && cachedAccessToken && now < tokenExpiresAt) {
    return cachedAccessToken;
  }

  // Ensure DNS resolves cloud-as.ruijienetworks.com reliably
  try {
    const dns = await import('node:dns');
    dns.setServers(['8.8.8.8', '1.1.1.1']);
    dns.setDefaultResultOrder('ipv4first');
  } catch {
    // Fallback gracefully if node:dns is not available
  }

  let baseUrl = (process.env.RUIJIE_BASE_URL || 'https://cloud-as.ruijienetworks.com').replace(/\/$/, '');
  let appId = process.env.RUIJIE_APP_ID || 'open1d9ecf635290';
  let appSecret = process.env.RUIJIE_APP_SECRET || 'a5dfb884bd7847cf8f21d28088f48a7e';

  // Fallback to database settings if available
  try {
    const s = await db.settings.get();
    if (s?.monitoring?.ruijieAppId) appId = s.monitoring.ruijieAppId;
    if (s?.monitoring?.ruijieAppSecret) appSecret = s.monitoring.ruijieAppSecret;
    if (s?.monitoring?.ruijieApiEndpoint) baseUrl = s.monitoring.ruijieApiEndpoint.replace(/\/$/, '');
  } catch {
    // Keep environment variables
  }

  const authUrl = `${baseUrl}/service/api/oauth20/client/access_token?token=${RUIJIE_TOKEN_SALT}`;

  console.log(`[Ruijie OpenAPI] Authenticating with ${baseUrl} (App ID: ${appId})...`);

  const res = await fetch(authUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      appid: appId,
      secret: appSecret,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    throw new Error(`Ruijie OAuth HTTP error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as RuijieTokenResponse;
  if (data.code !== 0 || !data.accessToken) {
    throw new Error(`Ruijie OAuth authentication failed (${data.code}): ${data.msg || 'Unknown error'}`);
  }

  cachedAccessToken = data.accessToken;
  // Expire in 25 days (Ruijie default token validity is 30 days)
  tokenExpiresAt = now + 25 * 24 * 60 * 60 * 1000;

  console.log('[Ruijie OpenAPI] Access token acquired successfully.');
  return cachedAccessToken;
}

/**
 * Fetch Account & Organization details from Ruijie Cloud
 */
export async function fetchRuijieAccountInfo(accessToken: string, baseUrl: string) {
  try {
    const res = await fetch(`${baseUrl}/service/api/org/account/info?access_token=${accessToken}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as RuijieAccountResponse;
      if (data.code === 0) {
        return {
          company: data.company || 'Multifactors Sales',
          account: data.account || 'parallelaccount@multifactors-sales.com',
          userName: data.userName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          phone: data.phone || '09177113478',
        };
      }
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Ruijie OpenAPI] Account info query notice:', msg);
  }
  return null;
}

export interface RuijieTenantRecord {
  id: number;
  name: string;
  userType: string;
  isDefault?: boolean;
  isCurrent?: boolean;
  enetParentGroupId?: string;
}

/**
 * Fetch all accessible tenants (including Received / Shared project tenants)
 */
export async function fetchRuijieTenants(accessToken: string, baseUrl: string): Promise<RuijieTenantRecord[]> {
  try {
    const res = await fetch(`${baseUrl}/service/api/org/account/tenants?access_token=${accessToken}`, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = (await res.json()) as { code: number; tenants?: RuijieTenantRecord[] };
      if (data.code === 0 && Array.isArray(data.tenants)) {
        return data.tenants;
      }
    }
  } catch (err: unknown) {
    console.warn('[Ruijie OpenAPI] Tenant list query notice:', err);
  }
  return [];
}

export interface RuijieGroupNode {
  groupId: number;
  name: string;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
  timezone?: string;
  parentGroupName?: string;
  tenantId?: number;
  subGroups?: RuijieGroupNode[];
}

interface RuijieRawGroup {
  groupId?: number;
  name?: string;
  type?: string;
  latitude?: string | number;
  longitude?: string | number;
  timezone?: string;
  parentGroupName?: string;
  subGroups?: RuijieRawGroup[];
}

/**
 * Fetch Network Group Tree from Ruijie Cloud (optionally per tenant)
 */
export async function fetchRuijieGroupTree(accessToken: string, baseUrl: string, tenantId?: number): Promise<RuijieGroupNode[]> {
  let url = `${baseUrl}/service/api/group/single/tree?depth=DEVICE&access_token=${accessToken}`;
  if (tenantId) {
    url += `&tenantId=${tenantId}`;
  }
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) {
    throw new Error(`Group tree fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as { code: number; msg?: string; groups?: RuijieRawGroup };
  if (data.code !== 0 || !data.groups) {
    return [];
  }

  const result: RuijieGroupNode[] = [];

  function traverse(node: RuijieRawGroup | null | undefined, parentName?: string) {
    if (!node) return;

    const lat = node.latitude ? parseFloat(String(node.latitude)) : null;
    const lng = node.longitude ? parseFloat(String(node.longitude)) : null;

    if (node.groupId && node.groupId !== 0) {
      result.push({
        groupId: node.groupId,
        name: node.name || 'Network Group',
        type: node.type,
        latitude: lat && !isNaN(lat) ? lat : null,
        longitude: lng && !isNaN(lng) ? lng : null,
        timezone: node.timezone,
        parentGroupName: parentName || node.parentGroupName,
        tenantId,
      });
    }

    if (Array.isArray(node.subGroups)) {
      for (const sub of node.subGroups) {
        traverse(sub, node.name);
      }
    }
  }

  traverse(data.groups);
  return result;
}

export interface RuijieDeviceRecord {
  serialNumber: string;
  productClass: string;
  productType: string;
  commonType: string;
  aliasName?: string;
  name?: string;
  groupId: number;
  groupName: string;
  localIp: string;
  cpeIp?: string;
  mac: string;
  onlineStatus: 'ON' | 'OFF' | string;
  offlineReason?: string;
  softwareVersion?: string;
  hardwareVersion?: string;
  lastOnline?: number;
}

/**
 * Fetch all devices under a Ruijie Group
 */
export async function fetchRuijieDevices(accessToken: string, baseUrl: string, groupId: number, tenantId?: number): Promise<RuijieDeviceRecord[]> {
  try {
    let url = `${baseUrl}/service/api/maint/devices?access_token=${accessToken}&group_id=${groupId}&page=0&per_page=100`;
    if (tenantId) url += `&tenantId=${tenantId}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = (await res.json()) as { code: number; deviceList?: RuijieDeviceRecord[] };
    if (data.code === 0 && Array.isArray(data.deviceList)) {
      return data.deviceList;
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[Ruijie OpenAPI] Device fetch notice for group ${groupId}:`, msg);
  }
  return [];
}

/**
 * Format MAC string to standard colon format XX:XX:XX:XX:XX:XX
 */
function formatMac(mac: string | undefined | null): string {
  if (!mac) return '50:D2:F5:00:00:01';
  const clean = mac.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  if (clean.length === 12) {
    return clean.match(/.{1,2}/g)!.join(':');
  }
  return mac.toUpperCase();
}

/**
 * Main telemetry sync function connecting Ruijie Cloud Open Platform to MySQL
 */
export async function syncRuijieCloudTelemetry(): Promise<RuijieSyncResult> {
  const baseUrl = (process.env.RUIJIE_BASE_URL || 'https://cloud-as.ruijienetworks.com').replace(/\/$/, '');
  const appId = process.env.RUIJIE_APP_ID || 'open1d9ecf635290';
  const appSecret = process.env.RUIJIE_APP_SECRET || 'a5dfb884bd7847cf8f21d28088f48a7e';

  console.log(`[Ruijie Sync] Initiating telemetry sync with ${baseUrl} (App ID: ${appId})...`);

  // 1. Authenticate with Ruijie Cloud OpenAPI
  let accessToken: string;
  try {
    accessToken = await getRuijieAccessToken();
  } catch (authErr: unknown) {
    const msg = authErr instanceof Error ? authErr.message : String(authErr);
    console.error(`[Ruijie Sync] Authentication failed: ${msg}`);
    throw authErr;
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // 2. Fetch Account & Tenant Info (with pacing)
  const accountInfo = await fetchRuijieAccountInfo(accessToken, baseUrl);
  await sleep(350);
  const tenants = await fetchRuijieTenants(accessToken, baseUrl);
  await sleep(350);

  // 3. Fetch Network Groups & Tree across primary account & accessible tenants (including Received / Shared Projects)
  const allGroupNodesMap = new Map<number, RuijieGroupNode>();
  
  // Primary group tree
  try {
    const primaryTree = await fetchRuijieGroupTree(accessToken, baseUrl);
    for (const g of primaryTree) {
      allGroupNodesMap.set(g.groupId, g);
    }
  } catch (treeErr: unknown) {
    const msg = treeErr instanceof Error ? treeErr.message : String(treeErr);
    console.warn(`[Ruijie Sync] Primary group tree warning: ${msg}`);
  }

  // Multi-tenant group trees for shared/received project tenants
  for (const tenant of tenants) {
    if (tenant.id) {
      await sleep(350);
      try {
        const tenantTree = await fetchRuijieGroupTree(accessToken, baseUrl, tenant.id);
        for (const g of tenantTree) {
          if (!allGroupNodesMap.has(g.groupId)) {
            allGroupNodesMap.set(g.groupId, { ...g, parentGroupName: g.parentGroupName || tenant.name });
          }
        }
      } catch {}
    }
  }

  const groupNodes = Array.from(allGroupNodesMap.values());
  console.log(`[Ruijie Sync] Retrieved ${groupNodes.length} group nodes from Ruijie Cloud across ${tenants.length || 1} tenant(s).`);

  // 4. Fetch Devices for each group (deduplicated by serial number with pacing)
  const allDevices: RuijieDeviceRecord[] = [];
  const seenSn = new Set<string>();
  for (const group of groupNodes) {
    await sleep(350);
    const devs = await fetchRuijieDevices(accessToken, baseUrl, group.groupId, group.tenantId);
    for (const d of devs) {
      if (d.serialNumber && !seenSn.has(d.serialNumber)) {
        seenSn.add(d.serialNumber);
        allDevices.push(d);
      }
    }
  }
  console.log(`[Ruijie Sync] Retrieved ${allDevices.length} unique live hardware devices from Ruijie Cloud.`);

  // 5. Synchronize with MySQL
  const pool = await getDbPool();
  if (!pool) {
    throw new Error('MySQL connection pool is not available.');
  }

  // Clean up legacy static mock entries and ROOT container group entries if present
  await pool.query("DELETE FROM sites WHERE id IN ('site-ojt', 'site-rj-9585986') OR name IN ('parallelaccount', 'dumy')").catch(() => {});
  await pool.query("DELETE FROM devices WHERE site_id IN ('site-ojt', 'site-rj-9585986')").catch(() => {});

  // Synchronize settings table with active credentials
  await pool.query(
    `INSERT INTO system_settings (config_key, config_value, category)
     VALUES ('ruijie.appId', ?, 'general'),
            ('ruijie.appSecret', ?, 'general'),
            ('ruijie.baseUrl', ?, 'general')
     ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
    [appId, appSecret, baseUrl]
  ).catch(() => {});

  // Load handler assignment for linking
  const [assignmentRows] = await pool.query<RowDataPacket[]>('SELECT id, area_name, person_name FROM area_assignments').catch(() => [[] as RowDataPacket[]]);
  const findHandlerId = (provinceOrCity: string): string | null => {
    if (!assignmentRows || !Array.isArray(assignmentRows) || assignmentRows.length === 0) return null;
    const norm = (provinceOrCity || '').toLowerCase().replace(/\s+area$/i, '').trim();
    const found = assignmentRows.find((a: RowDataPacket) => {
      const aNorm = String(a.area_name || '').toLowerCase().replace(/\s+area$/i, '').trim();
      return aNorm === norm || aNorm.includes(norm) || norm.includes(aNorm);
    });
    return found ? (found.id as string) : (assignmentRows[0]?.id as string) || null;
  };

  let totalSyncedSites = 0;
  let totalSyncedDevices = 0;
  let totalActiveAlarms = 0;
  const newDowntimeEvents = 0;

  // Filter out ROOT organizational container groups (e.g. type === 'ROOT' or account-level parent containers with 0 devices)
  const siteGroups = groupNodes.filter((g) => {
    if (g.type === 'ROOT') return false;
    if (g.name.toLowerCase() === 'dumy' || g.name.toLowerCase() === 'parallelaccount') {
      const groupDevices = allDevices.filter((d) => d.groupId === g.groupId || d.groupName === g.name);
      if (groupDevices.length === 0) return false;
    }
    return true;
  });

  if (siteGroups.length === 0) {
    const [existingSites] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM sites');
    const [existingDevs] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM devices');
    const countSites = (existingSites?.[0]?.count as number) || 0;
    const countDevs = (existingDevs?.[0]?.count as number) || 0;
    return {
      success: true,
      message: `Ruijie Cloud Open API (${appId}) connected: ${countSites} site(s), ${countDevs} device(s) in database.`,
      syncedSites: countSites,
      syncedDevices: countDevs,
      activeAlarms: 0,
      newDowntimeEvents: 0,
      resolvedEvents: 0,
      mode: 'live_cloud',
      timestamp: new Date().toISOString(),
      account: accountInfo || undefined,
    };
  }

  // Process valid site groups received from Ruijie Cloud API
  for (const group of siteGroups) {
    // Match live devices returned for this groupId or groupName
    const groupDevices = allDevices.filter((d) => d.groupId === group.groupId || d.groupName === group.name);

    const siteId = `site-rj-${group.groupId}`;
    const siteCode = `RJ-${group.groupId}`;
    const siteName = group.name;

    // Live coordinates from Ruijie Cloud
    const lat = group.latitude !== null && group.latitude !== undefined ? group.latitude : 0;
    const lng = group.longitude !== null && group.longitude !== undefined ? group.longitude : 0;

    const province = group.parentGroupName || accountInfo?.company || 'Ruijie Cloud';
    const handlerId = findHandlerId(province);

    const devCount = groupDevices.length;
    const offCount = groupDevices.filter((d) => d.onlineStatus !== 'ON').length;
    const onCount = Math.max(0, devCount - offCount);
    const isDown = devCount > 0 && offCount > 0;
    const isAllOff = devCount > 0 && offCount === devCount;
    const status = isDown ? 'Downtime' : 'Operational';
    const alarmType = isAllOff ? 'All device offline' : isDown ? `${offCount} of ${devCount} devices offline` : null;
    const severity = isAllOff ? 'Critical' : isDown ? 'Moderate' : null;

    const primaryDevice = groupDevices[0];
    const ip = primaryDevice?.localIp || primaryDevice?.cpeIp || '';

    // Count by hardware category from live API data
    let apCount = 0;
    let apOff = 0;
    let gwCount = 0;
    let gwOff = 0;
    let swCount = 0;
    let swOff = 0;

    for (const d of groupDevices) {
      const cType = (d.commonType || d.productType || '').toUpperCase();
      const isDevOff = d.onlineStatus !== 'ON';
      if (cType === 'AP' || cType === 'EAP' || cType === 'WAP') {
        apCount++;
        if (isDevOff) apOff++;
      } else if (cType === 'SWITCH' || cType === 'ESW' || cType === 'SW') {
        swCount++;
        if (isDevOff) swOff++;
      } else {
        gwCount++;
        if (isDevOff) gwOff++;
      }
    }

    totalSyncedSites++;
    totalSyncedDevices += devCount;
    if (offCount > 0) totalActiveAlarms += offCount;

    // Ingest/update site in MySQL
    await pool.query(
      `INSERT INTO sites
         (id, name, code, region, province, status, device_count, offline_count, online_count,
          active_alarm_count, alarm_type, severity, downtime_started_at, last_known_ip, latitude, longitude,
          assigned_handler_id, ruijie_group_id, ap_count, ap_offline, gateway_count, gateway_offline, switch_count, switch_offline)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         province = VALUES(province),
         status = VALUES(status),
         device_count = VALUES(device_count),
         offline_count = VALUES(offline_count),
         online_count = VALUES(online_count),
         active_alarm_count = VALUES(active_alarm_count),
         alarm_type = VALUES(alarm_type),
         severity = VALUES(severity),
         last_known_ip = VALUES(last_known_ip),
         latitude = VALUES(latitude),
         longitude = VALUES(longitude),
         ruijie_group_id = VALUES(ruijie_group_id),
         ap_count = VALUES(ap_count),
         ap_offline = VALUES(ap_offline),
         gateway_count = VALUES(gateway_count),
         gateway_offline = VALUES(gateway_offline),
         switch_count = VALUES(switch_count),
         switch_offline = VALUES(switch_offline)`,
      [
        siteId, siteName, siteCode, group.timezone || 'Asia/Manila', province, status,
        devCount, offCount, onCount, offCount, alarmType, severity,
        isDown ? new Date() : null, ip, lat, lng,
        handlerId, String(group.groupId),
        apCount, apOff, gwCount, gwOff, swCount, swOff
      ]
    );

    // Ingest live devices strictly from Ruijie Cloud API response
    for (let idx = 0; idx < groupDevices.length; idx++) {
      const d = groupDevices[idx];
      const devId = `dev-${siteId}-${d.serialNumber || idx + 1}`;
      const devName = d.aliasName || d.name || d.productClass || 'Device';
      const model = d.productClass || 'Ruijie Device';
      const mac = formatMac(d.mac);
      const devIp = d.localIp || d.cpeIp || ip;
      const cType = (d.commonType || d.productType || '').toUpperCase();
      const devType = (cType === 'AP' || cType === 'EAP') ? 'AccessPoint' : (cType === 'SWITCH' || cType === 'ESW') ? 'Switch' : 'Gateway';
      const devStatus = d.onlineStatus === 'ON' ? 'Online' : 'Offline';

      await pool.query(
        `INSERT INTO devices
           (id, site_id, device_name, model, serial_number, mac_address, ip_address, device_type, status, ruijie_device_id, last_heartbeat_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
         ON DUPLICATE KEY UPDATE
           device_name = VALUES(device_name),
           model = VALUES(model),
           serial_number = VALUES(serial_number),
           mac_address = VALUES(mac_address),
           ip_address = VALUES(ip_address),
           device_type = VALUES(device_type),
           status = VALUES(status),
           last_heartbeat_at = NOW()`,
        [
          devId, siteId, devName, model, d.serialNumber, mac, devIp, devType, devStatus, `rj-dev-${d.serialNumber}`
        ]
      ).catch(() => {});
    }
  }

  // Record sync cycle in activity_logs
  try {
    const [recentSyncRows] = await pool.query<RowDataPacket[]>(
      `SELECT id FROM activity_logs WHERE title = 'Ruijie Cloud Telemetry Auto-Sync' ORDER BY created_at DESC LIMIT 1`
    );
    const accountStr = accountInfo ? `${accountInfo.company || 'Account'} (${accountInfo.account || accountInfo.userName})` : 'Account';
    const syncDesc = `Synchronized live telemetry from Ruijie Cloud Open API (${appId}) - ${accountStr} with ${totalSyncedSites} group(s) and ${totalSyncedDevices} live hardware device(s).`;

    if (recentSyncRows && recentSyncRows.length > 0) {
      await pool.query(
        `UPDATE activity_logs SET description = ?, site_name = ?, created_at = NOW() WHERE id = ?`,
        [syncDesc, groupNodes[0]?.name || 'Ruijie Cloud', recentSyncRows[0].id]
      );
    } else {
      await pool.query(
        `INSERT INTO activity_logs (id, type, title, description, site_name, severity, created_at)
         VALUES (?, 'system', 'Ruijie Cloud Telemetry Auto-Sync', ?, ?, 'info', NOW())`,
        [`act-${Date.now()}`, syncDesc, groupNodes[0]?.name || 'Ruijie Cloud']
      );
    }
  } catch (e: unknown) {
    console.warn('[Ruijie Sync Log Error]', e);
  }

  console.log(`[Ruijie Sync Complete] Sites: ${totalSyncedSites} | Devices: ${totalSyncedDevices} | Active Alarms: ${totalActiveAlarms}`);

  return {
    success: true,
    message: `Ruijie Cloud Open API (${appId}) synchronized successfully: ${totalSyncedSites} sites, ${totalSyncedDevices} devices, ${totalActiveAlarms} active alarms.`,
    syncedSites: totalSyncedSites,
    syncedDevices: totalSyncedDevices,
    activeAlarms: totalActiveAlarms,
    newDowntimeEvents,
    resolvedEvents: 0,
    mode: 'live_cloud',
    timestamp: new Date().toISOString(),
    account: accountInfo || undefined,
  };
}

/**
 * Record a real-time outage event from Ruijie Cloud API / Webhook
 */
export async function recordSiteOutage(params: {
  siteId?: string;
  siteName?: string;
  siteCode?: string;
  alarmType?: string;
  severity?: string;
  offlineCount?: number;
  totalDevices?: number;
  lastKnownIp?: string;
}) {
  const pool = await getDbPool();
  if (!pool) throw new Error('Database pool not connected');

  let targetSite: RowDataPacket | null = null;
  if (params.siteId) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM sites WHERE id = ?', [params.siteId]);
    if (rows && rows.length > 0) targetSite = rows[0];
  }
  if (!targetSite && params.siteName) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM sites WHERE LOWER(name) = LOWER(?)', [params.siteName.trim()]);
    if (rows && rows.length > 0) targetSite = rows[0];
  }
  if (!targetSite && params.siteCode) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM sites WHERE LOWER(code) = LOWER(?)', [params.siteCode.trim()]);
    if (rows && rows.length > 0) targetSite = rows[0];
  }

  if (!targetSite) {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT * FROM sites LIMIT 1');
    if (rows && rows.length > 0) targetSite = rows[0];
    else throw new Error('No sites found in database.');
  }

  const devCount = params.totalDevices || (targetSite.device_count as number) || 1;
  const offCount = params.offlineCount !== undefined ? params.offlineCount : devCount;
  const onCount = Math.max(0, devCount - offCount);
  const isAllOffline = offCount >= devCount;
  const alarmType = params.alarmType || (isAllOffline ? 'All device offline' : 'Device Offline Alarm');
  const severity = params.severity || (isAllOffline ? 'Critical' : 'Moderate');
  const ip = params.lastKnownIp || (targetSite.last_known_ip as string) || '192.168.11.3';

  await pool.query(
    `UPDATE sites 
     SET status = 'Downtime',
         device_count = ?,
         offline_count = ?,
         online_count = ?,
         active_alarm_count = ?,
         alarm_type = ?,
         severity = ?,
         downtime_started_at = COALESCE(downtime_started_at, NOW()),
         last_known_ip = ?
     WHERE id = ?`,
    [devCount, offCount, onCount, offCount, alarmType, severity, ip, targetSite.id]
  );

  await pool.query(
    "UPDATE devices SET status = 'Offline' WHERE site_id = ?",
    [targetSite.id]
  ).catch(() => {});

  const eventId = `evt-${targetSite.id as string}`;
  await pool.query(
    `INSERT INTO downtime_events
       (id, site_id, alarm_type, severity, status, generated_at, duration_seconds, affected_device_count, offline_device_count, last_known_ip, assigned_handler_id)
     VALUES (?, ?, ?, ?, 'Active', NOW(), 60, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       status = 'Active',
       alarm_type = VALUES(alarm_type),
       severity = VALUES(severity),
       offline_device_count = VALUES(offline_device_count),
       generated_at = NOW()`,
    [eventId, targetSite.id, alarmType, severity, devCount, offCount, ip, targetSite.assigned_handler_id]
  );

  const logId = `ACT-RUIJIE-${Date.now().toString().slice(-5)}`;
  await pool.query(
    `INSERT INTO activity_logs 
       (id, type, title, description, site_id, site_name, site_code, severity, created_at)
     VALUES (?, 'outage', '🚨 Ruijie Cloud Outage Alarm', ?, ?, ?, ?, 'critical', NOW())`,
    [
      logId,
      `Ruijie Cloud API detected site outage at ${targetSite.name as string} (${targetSite.code as string}) - ${isAllOffline ? 'All Devices Offline' : `${offCount} device(s) offline`}.`,
      targetSite.id,
      targetSite.name,
      targetSite.code,
    ]
  ).catch(() => {});

  return {
    success: true,
    siteId: targetSite.id as string,
    siteName: targetSite.name as string,
    siteCode: targetSite.code as string,
    province: targetSite.province as string,
    status: 'Downtime',
    offlineCount: offCount,
    deviceCount: devCount,
    isAllOffline,
  };
}

/**
 * Record a real-time site recovery from Ruijie Cloud API / Webhook
 */
export async function recordSiteRecovery(siteIdentifier: string) {
  const pool = await getDbPool();
  if (!pool) throw new Error('Database pool not connected');

  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT * FROM sites WHERE id = ? OR LOWER(name) = LOWER(?) OR LOWER(code) = LOWER(?)',
    [siteIdentifier, siteIdentifier.trim(), siteIdentifier.trim()]
  );
  if (!rows || rows.length === 0) return { success: false, message: 'Site not found' };

  const site = rows[0];

  await pool.query(
    `UPDATE sites 
     SET status = 'Operational',
         offline_count = 0,
         online_count = device_count,
         active_alarm_count = 0,
         alarm_type = NULL,
         severity = NULL,
         downtime_started_at = NULL
     WHERE id = ?`,
    [site.id]
  );

  await pool.query("UPDATE devices SET status = 'Online' WHERE site_id = ?", [site.id]).catch(() => {});
  await pool.query("UPDATE downtime_events SET status = 'Resolved', resolved_at = NOW() WHERE site_id = ?", [site.id]).catch(() => {});

  const logId = `ACT-REC-${Date.now().toString().slice(-5)}`;
  await pool.query(
    `INSERT INTO activity_logs 
       (id, type, title, description, site_id, site_name, site_code, severity, created_at)
     VALUES (?, 'recovery', '✅ Ruijie Cloud Site Restored', ?, ?, ?, ?, 'info', NOW())`,
    [
      logId,
      `Ruijie Cloud API reported ${site.name as string} (${site.code as string}) back online. All devices operational.`,
      site.id,
      site.name,
      site.code,
    ]
  ).catch(() => {});

  return { success: true, siteId: site.id as string, siteName: site.name as string, status: 'Operational' };
}
