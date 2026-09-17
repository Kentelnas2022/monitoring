import type { Pool, RowDataPacket } from 'mysql2/promise';
import { initialSystemSettings } from '@/data/mockSettings';
import { ActivityLog, AssignedHandler, SiteInfrastructure } from '@/types/dashboard';
import { SystemSettings } from '@/types/settings';
import { hashPassword, verifyPassword } from '@/lib/auth';

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  status: string;
  password?: string;
  twoFactorEnabled?: boolean;
  lastLoginAt?: string;
}

interface AreaAssignmentRecord {
  id: string;
  area: string;
  personName: string;
  phone: string;
  telegram: string;
  chatId?: string;
  role: string;
  status: string;
}

interface TelegramDispatchRecord {
  id: string;
  siteId?: string;
  siteName: string;
  recipientName: string;
  telegramUsername: string;
  chatId?: string;
  messageBody: string;
  status: 'Sent' | 'Delivered' | 'Failed';
  notes?: string;
  sentAt?: string;
}

interface DbUserRow extends RowDataPacket {
  id: string;
  full_name: string;
  email: string;
  username: string;
  password_hash: string;
  role: string;
  status: string;
  two_factor_enabled?: number;
  last_login_at?: Date | string;
}

interface DbSiteRow extends RowDataPacket {
  id: string;
  name: string;
  code: string;
  region: string;
  province: string;
  status: 'Operational' | 'Downtime' | 'Maintenance';
  device_count: number;
  offline_count: number;
  online_count: number;
  active_alarm_count: number;
  alarm_type?: string;
  severity?: 'Critical' | 'Moderate';
  downtime_started_at?: Date | string;
  last_known_ip: string;
  latitude: number | string;
  longitude: number | string;
  ap_count?: number;
  ap_offline?: number;
  gateway_count?: number;
  gateway_offline?: number;
  switch_count?: number;
  switch_offline?: number;
  contact_person_name?: string;
  contact_person_phone?: string;
  contact_person_social?: string;
  contact_person_role?: string;
  handler_name?: string;
  handler_phone?: string;
  handler_telegram?: string;
  handler_chat_id?: string;
  handler_role?: string;
  event_alarm_type?: string;
  event_severity?: 'Critical' | 'Moderate';
  duration_seconds?: number;
}

interface DbDeviceRow extends RowDataPacket {
  id: string;
  site_id: string;
  device_name: string;
  model: string;
  serial_number: string;
  mac_address: string;
  ip_address: string;
  device_type: string;
  status: string;
}

interface DbEventRow extends RowDataPacket {
  id: string;
  site_id: string;
  site_name: string;
  site_code: string;
  province: string;
  alarm_type: string;
  severity: 'Critical' | 'Moderate';
  generated_at: string;
  duration_seconds: number;
  affected_device_count: number;
  offline_device_count: number;
  last_known_ip: string;
  handler_name?: string;
  handler_phone?: string;
  handler_telegram?: string;
  status: string;
}

// MySQL pool initialized safely
let mysqlPool: Pool | null = null;
let poolPromise: Promise<Pool | null> | null = null;
let isConnectedToLiveDb = false;
let lastConnectionAttempt = 0;
let connectionFailed = false;

// Initialize MySQL pool safely and verify connectivity before returning
export async function getDbPool(): Promise<Pool | null> {
  if (mysqlPool && isConnectedToLiveDb) return mysqlPool;
  if (poolPromise) return poolPromise;

  const now = Date.now();
  if (connectionFailed && now - lastConnectionAttempt < 10000) {
    return null;
  }
  lastConnectionAttempt = now;

  poolPromise = (async () => {
    const dbUrl = process.env.DATABASE_URL;
    const host = process.env.MYSQL_HOST || 'localhost';
    const user = process.env.MYSQL_USER || 'root';
    const password = process.env.MYSQL_PASSWORD !== undefined ? process.env.MYSQL_PASSWORD : '';
    const database = process.env.MYSQL_DATABASE || 'monitoring_system';
    const port = Number(process.env.MYSQL_PORT || 3306);

    try {
      const mysql = await import('mysql2/promise');
      let candidatePool: Pool | null = null;

      if (dbUrl) {
        candidatePool = mysql.createPool({
          uri: dbUrl,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      } else {
        candidatePool = mysql.createPool({
          host,
          user,
          password,
          database,
          port,
          waitForConnections: true,
          connectionLimit: 10,
          queueLimit: 0,
        });
      }

      // Verify connection with ping
      const conn = await candidatePool.getConnection();
      await conn.ping();

      // Ensure contact person columns exist on sites table in MySQL
      try {
        await conn.query(`
          ALTER TABLE sites 
          ADD COLUMN IF NOT EXISTS contact_person_name VARCHAR(120) NULL,
          ADD COLUMN IF NOT EXISTS contact_person_phone VARCHAR(32) NULL,
          ADD COLUMN IF NOT EXISTS contact_person_social VARCHAR(64) NULL,
          ADD COLUMN IF NOT EXISTS contact_person_role VARCHAR(80) NULL DEFAULT 'Designated Responder'
        `);
      } catch {
        // Fallback for MySQL versions without IF NOT EXISTS on ADD COLUMN
        try {
          await conn.query('ALTER TABLE sites ADD COLUMN contact_person_name VARCHAR(120) NULL');
        } catch {}
        try {
          await conn.query('ALTER TABLE sites ADD COLUMN contact_person_phone VARCHAR(32) NULL');
        } catch {}
        try {
          await conn.query('ALTER TABLE sites ADD COLUMN contact_person_social VARCHAR(64) NULL');
        } catch {}
        try {
          await conn.query('ALTER TABLE sites ADD COLUMN contact_person_role VARCHAR(80) NULL DEFAULT "Designated Responder"');
        } catch {}
      }

      conn.release();

      mysqlPool = candidatePool;
      isConnectedToLiveDb = true;
      connectionFailed = false;
      return mysqlPool;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.warn(`[Database Notice] Could not connect to live MySQL (${errMsg}). Using resilient in-memory store.`);
      mysqlPool = null;
      isConnectedToLiveDb = false;
      connectionFailed = true;
      return null;
    } finally {
      poolPromise = null;
    }
  })();

  return poolPromise;
}

// -----------------------------------------------------------------------------
// IN-MEMORY RESILIENT STORE (Matches MySQL Schema 1:1)
// -----------------------------------------------------------------------------
let memoryAssignments: AreaAssignmentRecord[] = [];
let memoryUsers: UserRecord[] = [];
const memorySites: SiteInfrastructure[] = [];
let memoryActivityLogs: ActivityLog[] = [];
let memorySettings = { ...initialSystemSettings };
const memoryDispatches: TelegramDispatchRecord[] = [];

// Helper to resolve municipality and landmark address from Ruijie Cloud telemetry
export function parseSiteLocation(name: string, province: string): { municipality: string; landmark?: string } {
  return {
    municipality: province || name || 'Regional',
    landmark: name || undefined,
  };
}

// -----------------------------------------------------------------------------
// UNIFIED DATABASE ACCESS LAYER (Routes to MySQL or Memory Fallback)
// -----------------------------------------------------------------------------

export const db = {
  // Check live status
  async isLive(): Promise<boolean> {
    const pool = await getDbPool();
    return pool !== null && isConnectedToLiveDb;
  },

  // 0. USERS & DYNAMIC AUTHENTICATION
  users: {
    async getAll() {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<DbUserRow[]>(
            'SELECT id, full_name as fullName, email, username, role, status, two_factor_enabled as twoFactorEnabled, last_login_at as lastLoginAt FROM users ORDER BY created_at ASC'
          );
          return rows;
        } catch (e: unknown) {
          console.error('[DB error on users.getAll]', e);
        }
      }
      return memoryUsers.map((u) => {
        const cleanUser = { ...u };
        delete cleanUser.password;
        return cleanUser;
      });
    },

    async authenticate(identifier: string, passwordAttempt: string) {
      const cleanIdent = identifier.trim().toLowerCase();
      const cleanPass = passwordAttempt.trim();

      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<DbUserRow[]>(
            'SELECT id, full_name, email, username, password_hash, role, status FROM users WHERE LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
            [cleanIdent, cleanIdent]
          );
          if (!rows || rows.length === 0) {
            return {
              success: false,
              message: 'Account not found. Please verify your email or username.',
            };
          }

          const row = rows[0];
          const storedPass = row.password_hash;
          const isValid = verifyPassword(cleanPass, storedPass);

          if (isValid) {
            await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = ?', [row.id]).catch(() => {});
            return {
              success: true,
              user: {
                id: row.id,
                fullName: row.full_name,
                email: row.email,
                username: row.username,
                role: row.role,
                status: row.status,
              },
            };
          } else {
            return {
              success: false,
              message: 'Invalid password. Please check your credentials.',
            };
          }
        } catch (e: unknown) {
          console.error('[DB MySQL auth error]', e);
          return {
            success: false,
            message: 'Database authentication error. Please try again.',
          };
        }
      }

      return {
        success: false,
        message: 'Database connection offline. Please check MySQL service.',
      };
    },

    async updateProfile(id: string, updates: Partial<{ fullName: string; email: string; password: string }>) {
      const pool = await getDbPool();
      const passHash = updates.password ? hashPassword(updates.password) : undefined;
      if (pool) {
        try {
          if (passHash) {
            await pool.query(
              'UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email), password_hash = ? WHERE id = ?',
              [updates.fullName, updates.email, passHash, id]
            );
          } else {
            await pool.query(
              'UPDATE users SET full_name = COALESCE(?, full_name), email = COALESCE(?, email) WHERE id = ?',
              [updates.fullName, updates.email, id]
            );
          }
        } catch (e: unknown) {
          console.error('[DB error on users.updateProfile]', e);
        }
      }

      memoryUsers = memoryUsers.map((u) => {
        if (u.id === id) {
          return {
            ...u,
            ...(updates.fullName ? { fullName: updates.fullName } : {}),
            ...(updates.email ? { email: updates.email } : {}),
            ...(passHash ? { password: passHash } : {}),
          };
        }
        return u;
      });
      return true;
    },

    async changePassword(identifier: string, currentPasswordAttempt: string, newPasswordPlain: string) {
      const cleanIdent = (identifier || '').trim().toLowerCase();
      const cleanCurrent = currentPasswordAttempt.trim();
      const cleanNew = newPasswordPlain.trim();

      if (cleanNew.length < 8) {
        return { success: false, message: 'New password must be at least 8 characters long.' };
      }

      const pool = await getDbPool();
      if (pool) {
        try {
          let rows: DbUserRow[];
          if (cleanIdent) {
            [rows] = await pool.query<DbUserRow[]>(
              'SELECT id, username, email, full_name, password_hash FROM users WHERE id = ? OR LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
              [cleanIdent, cleanIdent, cleanIdent]
            );
          } else {
            [rows] = await pool.query<DbUserRow[]>(
              'SELECT id, username, email, full_name, password_hash FROM users ORDER BY created_at ASC LIMIT 1'
            );
          }

          if (!rows || rows.length === 0) {
            return { success: false, message: 'User account not found.' };
          }

          const user = rows[0];
          const isMatch = verifyPassword(cleanCurrent, user.password_hash);
          if (!isMatch) {
            return { success: false, message: 'Current password does not match. Please verify your current password.' };
          }

          const newBcryptHash = hashPassword(cleanNew);

          await pool.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newBcryptHash, user.id]
          );

          await pool.query(
            'INSERT INTO system_settings (config_key, config_value, category) VALUES ("account.password", ?, "account") ON DUPLICATE KEY UPDATE config_value = ?',
            [newBcryptHash, newBcryptHash]
          ).catch(() => {});

          await db.logs.add({
            type: 'system',
            title: 'Password Updated with Cryptographic Hash',
            description: `User ${user.full_name} (${user.username}) updated password. Encrypted and secured with bcrypt cryptographic hash.`,
            severity: 'info',
            timestamp: 'Just now',
          });

          return {
            success: true,
            message: 'Password updated and secured with cryptographic hash successfully!',
          };
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : 'Database error updating password.';
          return { success: false, message: errMsg };
        }
      }

      const found = memoryUsers.find(
        (u) => u.id === identifier || u.username.toLowerCase() === cleanIdent || u.email.toLowerCase() === cleanIdent
      );
      if (!found) return { success: false, message: 'User account not found.' };
      if (!verifyPassword(cleanCurrent, found.password || '')) {
        return { success: false, message: 'Current password does not match.' };
      }
      found.password = hashPassword(cleanNew);
      return { success: true, message: 'Password updated and secured with cryptographic hash successfully!' };
    },
  },

  // 1. AREA ASSIGNMENTS
  assignments: {
    async getAll(): Promise<AreaAssignmentRecord[]> {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, area_name as area, person_name as personName, phone, telegram_username as telegram, telegram_chat_id as chatId, role, status FROM area_assignments ORDER BY created_at ASC'
          );
          return rows as unknown as AreaAssignmentRecord[];
        } catch (e: unknown) {
          console.error('[DB error on assignments.getAll]', e);
        }
      }
      return [...memoryAssignments];
    },

    async add(item: { area: string; personName: string; phone: string; telegram: string; chatId?: string; role?: string }) {
      const id = `area-${Date.now()}`;
      const chatId = item.chatId || (/^\d+$/.test(item.telegram) ? item.telegram : null);
      const pool = await getDbPool();
      if (pool) {
        try {
          await pool.query(
            'INSERT INTO area_assignments (id, area_name, person_name, phone, telegram_username, telegram_chat_id, role, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, item.area, item.personName, item.phone, item.telegram.replace(/^@/, ''), chatId, item.role || 'Designated Area Responder', 'Connected']
          );
        } catch (e: unknown) {
          console.error('[DB error on assignments.add]', e);
        }
      }

      const newItem: AreaAssignmentRecord = {
        id,
        area: item.area,
        personName: item.personName,
        phone: item.phone,
        telegram: item.telegram.replace(/^@/, ''),
        chatId: chatId || '',
        role: item.role || 'Designated Area Responder',
        status: 'Connected',
      };
      memoryAssignments = [newItem, ...memoryAssignments];
      return newItem;
    },

    async update(id: string, item: Partial<{ area: string; personName: string; phone: string; telegram: string; chatId?: string }>) {
      const pool = await getDbPool();
      const chatId = item.chatId !== undefined ? item.chatId : (item.telegram && /^\d+$/.test(item.telegram) ? item.telegram : undefined);
      if (pool) {
        try {
          await pool.query(
            'UPDATE area_assignments SET area_name = COALESCE(?, area_name), person_name = COALESCE(?, person_name), phone = COALESCE(?, phone), telegram_username = COALESCE(?, telegram_username), telegram_chat_id = COALESCE(?, telegram_chat_id) WHERE id = ?',
            [item.area, item.personName, item.phone, item.telegram ? item.telegram.replace(/^@/, '') : undefined, chatId, id]
          );
        } catch (e: unknown) {
          console.error('[DB error on assignments.update]', e);
        }
      }

      memoryAssignments = memoryAssignments.map((a) =>
        a.id === id
          ? {
              ...a,
              ...(item.area ? { area: item.area } : {}),
              ...(item.personName ? { personName: item.personName } : {}),
              ...(item.phone ? { phone: item.phone } : {}),
              ...(item.telegram ? { telegram: item.telegram.replace(/^@/, '') } : {}),
              ...(chatId !== undefined ? { chatId } : {}),
            }
          : a
      );
      return memoryAssignments.find((a) => a.id === id);
    },

    async delete(id: string) {
      const pool = await getDbPool();
      if (pool) {
        try {
          await pool.query('DELETE FROM area_assignments WHERE id = ?', [id]);
        } catch (e: unknown) {
          console.error('[DB error on assignments.delete]', e);
        }
      }
      memoryAssignments = memoryAssignments.filter((a) => a.id !== id);
      return true;
    },
  },

  // 2. SITES & TELEMETRY
  sites: {
    async getAll(): Promise<SiteInfrastructure[]> {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<DbSiteRow[]>(`
            SELECT s.*, 
                   a.person_name as area_handler_name, a.phone as area_handler_phone, 
                   a.telegram_username as area_handler_telegram, a.telegram_chat_id as area_handler_chat_id, a.role as area_handler_role,
                   e.alarm_type as event_alarm_type, e.severity as event_severity,
                   e.duration_seconds
            FROM sites s
            LEFT JOIN area_assignments a ON s.assigned_handler_id = a.id
            LEFT JOIN downtime_events e ON e.site_id = s.id AND e.status = 'Active'
            ORDER BY s.status = 'Downtime' DESC, s.name ASC
          `);
          const [deviceRows] = await pool.query<DbDeviceRow[]>(`
            SELECT id, site_id, device_name, model, serial_number, mac_address, ip_address, device_type, status
            FROM devices
            ORDER BY device_type = 'Gateway' DESC, id ASC
          `).catch(() => [[] as DbDeviceRow[]]);

          const devicesBySiteId = new Map<string, Array<{
            id: string;
            name: string;
            model: string;
            serialNumber: string;
            macAddress: string;
            ipAddress: string;
            deviceType: string;
            status: string;
          }>>();

          if (Array.isArray(deviceRows)) {
            for (const d of deviceRows) {
              const arr = devicesBySiteId.get(d.site_id) || [];
              let model = d.model;
              if (!model || model === 'EAP') model = 'RG-RAP2200(E)';
              else if (model === 'EGW') model = 'RG-EG105G-P';
              else if (model === 'ESW') model = 'RG-ES205GC-P';

              arr.push({
                id: d.id,
                name: d.device_name,
                model,
                serialNumber: d.serial_number,
                macAddress: d.mac_address,
                ipAddress: d.ip_address,
                deviceType: d.device_type,
                status: d.status,
              });
              devicesBySiteId.set(d.site_id, arr);
            }
          }

          return rows.map((r: DbSiteRow) => {
            const durationMins = r.duration_seconds ? Math.round(r.duration_seconds / 60) : 0;
            const durationLabel = durationMins >= 60 
              ? `${Math.floor(durationMins / 60)}h ${String(durationMins % 60).padStart(2, '0')}m`
              : durationMins > 0 ? `${durationMins} mins` : undefined;

            const locDetails = parseSiteLocation(r.name, r.province);

            const resolvedName = r.contact_person_name || r.area_handler_name || 'Unassigned';
            const resolvedPhone = r.contact_person_phone || r.area_handler_phone || '+63 900 000 0000';
            const resolvedSocial = r.contact_person_social || r.area_handler_telegram || '';
            const resolvedRole = r.contact_person_role || r.area_handler_role || 'Designated Responder';
            const cleanTelegram = resolvedSocial ? resolvedSocial.replace(/^[^:]+:/, '').replace(/^@/, '') : '';
            const socialMedia = resolvedSocial 
              ? (resolvedSocial.includes(':') ? resolvedSocial : `@${resolvedSocial.replace(/^@/, '')}`)
              : '@noc_support';

            return {
              id: r.id,
              name: r.name,
              code: r.code,
              region: r.region,
              province: r.province,
              municipality: locDetails.municipality,
              landmark: locDetails.landmark,
              status: r.status,
              deviceCount: r.device_count,
              offlineCount: r.offline_count,
              onlineCount: r.online_count,
              activeAlarmCount: r.active_alarm_count,
              alarmType: r.event_alarm_type || r.alarm_type || undefined,
              severity: r.event_severity || r.severity || undefined,
              downtimeDuration: durationLabel || (r.downtime_started_at ? 'Active' : undefined),
              lastKnownIp: r.last_known_ip,
              coordinates: { lat: Number(r.latitude), lng: Number(r.longitude) },
              apCount: r.ap_count !== null && r.ap_count !== undefined ? Number(r.ap_count) : 0,
              apOffline: r.ap_offline !== null && r.ap_offline !== undefined ? Number(r.ap_offline) : 0,
              gatewayCount: r.gateway_count !== null && r.gateway_count !== undefined ? Number(r.gateway_count) : 0,
              gatewayOffline: r.gateway_offline !== null && r.gateway_offline !== undefined ? Number(r.gateway_offline) : 0,
              switchCount: r.switch_count !== null && r.switch_count !== undefined ? Number(r.switch_count) : 0,
              switchOffline: r.switch_offline !== null && r.switch_offline !== undefined ? Number(r.switch_offline) : 0,
              devices: devicesBySiteId.get(r.id) || [],
              assignedHandler: {
                name: resolvedName,
                phone: resolvedPhone,
                telegram: cleanTelegram,
                chatId: r.area_handler_chat_id || undefined,
                role: resolvedRole,
                socialMedia: socialMedia,
              },
            };
          });
        } catch (e: unknown) {
          console.error('[DB error on sites.getAll]', e);
        }
      }
      return [...memorySites];
    },

    async updateHandler(siteName: string, handler: AssignedHandler) {
      const pool = await getDbPool();
      const rawSocial = handler.socialMedia || (handler.telegram ? `@${handler.telegram.replace(/^@/, '')}` : '@noc_support');
      const cleanPhone = handler.phone?.trim() || '+63 900 000 0000';
      const cleanRole = handler.role || 'Designated Responder';
      const personName = handler.name.trim();

      if (pool) {
        try {
          // Direct UPDATE on sites table dedicated columns
          await pool.query(
            `UPDATE sites 
             SET contact_person_name = ?, 
                 contact_person_phone = ?, 
                 contact_person_social = ?, 
                 contact_person_role = ?
             WHERE name = ? OR code = ? OR id = ?`,
            [personName, cleanPhone, rawSocial, cleanRole, siteName, siteName, siteName]
          );
        } catch (e: unknown) {
          console.error('[DB error on sites.updateHandler]', e);
        }
      }

      // Keep in-memory store in sync as fallback
      const siteMem = memorySites.find((s) => s.name === siteName || s.code === siteName || s.id === siteName);
      if (siteMem) {
        siteMem.assignedHandler = {
          ...handler,
          name: personName,
          phone: cleanPhone,
          socialMedia: rawSocial,
          role: cleanRole,
        };
      }
      return true;
    },

    async updateAreaHandler(areaId: string, areaName: string, _handler: AssignedHandler) {
      void _handler;
      const pool = await getDbPool();
      const norm = areaName.toLowerCase().replace(/\s+area$/i, '').trim();
      if (pool) {
        try {
          await pool.query(
            'UPDATE sites SET assigned_handler_id = ? WHERE LOWER(province) LIKE ? OR LOWER(name) LIKE ? OR LOWER(region) LIKE ?',
            [areaId, `%${norm}%`, `%${norm}%`, `%${norm}%`]
          );
        } catch (e: unknown) {
          console.error('[DB error on sites.updateAreaHandler]', e);
        }
      }
      return true;
    },
  },

  // 3. ACTIVITY LOGS
  logs: {
    async getAll(): Promise<ActivityLog[]> {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<RowDataPacket[]>(
            'SELECT id, type, title, description, site_name as siteName, site_code as siteCode, person_name as personName, telegram_username as telegramUsername, severity, DATE_FORMAT(created_at, "%b %d, %Y %H:%i") as timestamp FROM activity_logs ORDER BY created_at DESC'
          );
          return rows as unknown as ActivityLog[];
        } catch (e: unknown) {
          console.error('[DB error on logs.getAll]', e);
        }
      }
      return [...memoryActivityLogs];
    },

    async add(log: Omit<ActivityLog, 'id'>) {
      const id = `act-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const pool = await getDbPool();
      if (pool) {
        try {
          await pool.query(
            'INSERT INTO activity_logs (id, type, title, description, site_name, site_code, person_name, telegram_username, severity) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [id, log.type, log.title, log.description, log.siteName || null, log.siteCode || null, log.personName || null, log.telegramUsername || null, log.severity || 'info']
          );
        } catch (e: unknown) {
          console.error('[DB error on logs.add]', e);
        }
      }

      const newLog: ActivityLog = { id, ...log };
      memoryActivityLogs = [newLog, ...memoryActivityLogs];
      return newLog;
    },

    async clear() {
      const pool = await getDbPool();
      if (pool) {
        try {
          await pool.query('DELETE FROM activity_logs');
        } catch (e: unknown) {
          console.error('[DB error on logs.clear]', e);
        }
      }
      memoryActivityLogs = [];
      return true;
    },
  },

  // 4. TELEGRAM DISPATCHES
  dispatches: {
    async log(data: {
      siteId?: string;
      siteName: string;
      recipientName: string;
      telegramUsername: string;
      chatId?: string;
      messageBody: string;
      status: 'Sent' | 'Delivered' | 'Failed';
      notes?: string;
    }) {
      const id = `disp-${Date.now()}`;
      const pool = await getDbPool();
      if (pool) {
        try {
          let resolvedSiteId = data.siteId;
          if (!resolvedSiteId && data.siteName) {
            const [matched] = await pool.query<RowDataPacket[]>(
              'SELECT id FROM sites WHERE name = ? OR code = ? LIMIT 1',
              [data.siteName, data.siteName]
            );
            if (matched && matched[0]) {
              resolvedSiteId = matched[0].id as string;
            }
          }
          if (!resolvedSiteId) {
            const [firstSite] = await pool.query<RowDataPacket[]>('SELECT id FROM sites LIMIT 1');
            resolvedSiteId = (firstSite[0]?.id as string) || '';
          }

          await pool.query(
            'INSERT INTO telegram_dispatches (id, site_id, recipient_name, telegram_username, telegram_chat_id, message_body, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, resolvedSiteId, data.recipientName, data.telegramUsername, data.chatId || null, data.messageBody, data.status, data.notes || null]
          );
        } catch (e: unknown) {
          console.error('[DB error on dispatches.log]', e);
        }
      }

      const record = { id, ...data, sentAt: new Date().toISOString() };
      memoryDispatches.push(record);
      return record;
    },
  },

  // 5. SYSTEM SETTINGS
  settings: {
    async get(): Promise<SystemSettings> {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<RowDataPacket[]>('SELECT config_key, config_value FROM system_settings');
          const map: Record<string, string> = {};
          rows.forEach((r) => { map[r.config_key as string] = r.config_value as string; });

          let dbUser: { fullName?: string; email?: string; role?: string; username?: string } | null = null;
          try {
            const [userRows] = await pool.query<RowDataPacket[]>('SELECT full_name as fullName, email, role, username FROM users ORDER BY created_at ASC LIMIT 1');
            if (userRows && userRows.length > 0) {
              dbUser = userRows[0] as unknown as { fullName?: string; email?: string; role?: string; username?: string };
            }
          } catch {}

          return {
            ...memorySettings,
            general: {
              ...memorySettings.general,
              language: map['general.language'] || memorySettings.general.language,
              timezone: map['general.timezone'] || memorySettings.general.timezone,
            },
            telegram: {
              ...memorySettings.telegram,
              botToken: map['telegram.botToken'] || memorySettings.telegram.botToken,
              channelId: map['telegram.channelId'] || memorySettings.telegram.channelId,
              autoDispatchOnDowntime: map['telegram.autoDispatchOnDowntime'] !== undefined 
                ? map['telegram.autoDispatchOnDowntime'] === 'true' 
                : memorySettings.telegram.autoDispatchOnDowntime,
            },
            monitoring: {
              ...memorySettings.monitoring,
              ruijieAppId: map['ruijie.appId'] || memorySettings.monitoring.ruijieAppId,
              ruijieAppSecret: map['ruijie.appSecret'] || memorySettings.monitoring.ruijieAppSecret,
              ruijieApiEndpoint: map['ruijie.baseUrl'] || memorySettings.monitoring.ruijieApiEndpoint,
              syncIntervalSeconds: map['monitoring.syncIntervalSeconds'] 
                ? Number(map['monitoring.syncIntervalSeconds']) 
                : memorySettings.monitoring.syncIntervalSeconds,
            },
            account: {
              ...memorySettings.account,
              fullName: dbUser?.fullName || map['account.fullName'] || memorySettings.account.fullName,
              email: dbUser?.email || map['account.email'] || memorySettings.account.email,
              role: dbUser?.role || memorySettings.account.role,
              telegramUsername: dbUser?.username || memorySettings.account.telegramUsername,
            },
          };
        } catch (e: unknown) {
          console.error('[DB error on settings.get]', e);
        }
      }
      return { ...memorySettings };
    },

    async update(updated: Partial<SystemSettings>) {
      const pool = await getDbPool();
      if (pool) {
        try {
          const queries: Array<[string, string | undefined]> = [
            ['general.language', updated.general?.language],
            ['general.timezone', updated.general?.timezone],
            ['account.fullName', updated.account?.fullName],
            ['account.email', updated.account?.email],
            ['ruijie.appId', updated.monitoring?.ruijieAppId],
            ['ruijie.appSecret', updated.monitoring?.ruijieAppSecret],
            ['ruijie.baseUrl', updated.monitoring?.ruijieApiEndpoint],
            ['monitoring.syncIntervalSeconds', updated.monitoring?.syncIntervalSeconds ? String(updated.monitoring.syncIntervalSeconds) : undefined],
            ['telegram.botToken', updated.telegram?.botToken],
            ['telegram.channelId', updated.telegram?.channelId],
            ['telegram.autoDispatchOnDowntime', updated.telegram?.autoDispatchOnDowntime !== undefined ? String(updated.telegram.autoDispatchOnDowntime) : undefined],
          ];
          for (const [k, v] of queries) {
            if (v !== undefined) {
              await pool.query(
                'INSERT INTO system_settings (config_key, config_value, category) VALUES (?, ?, "general") ON DUPLICATE KEY UPDATE config_value = ?',
                [k, String(v), String(v)]
              );
            }
          }
        } catch (e: unknown) {
          console.error('[DB error on settings.update]', e);
        }
      }
      memorySettings = { ...memorySettings, ...updated };

      if (updated.account) {
        await db.users.updateProfile('usr-01', {
          fullName: updated.account.fullName,
          email: updated.account.email,
          password: updated.account.password,
        });
      }

      return memorySettings;
    },
  },

  // 6. DOWNTIME INCIDENTS & ALARMS
  events: {
    async getActive() {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query<DbEventRow[]>(`
            SELECT e.*, s.name as site_name, s.code as site_code, s.province,
                   a.person_name as handler_name, a.phone as handler_phone, a.telegram_username as handler_telegram
            FROM downtime_events e
            JOIN sites s ON e.site_id = s.id
            LEFT JOIN area_assignments a ON e.assigned_handler_id = a.id
            WHERE e.status = 'Active'
            ORDER BY e.duration_seconds DESC
          `);
          return rows.map((r: DbEventRow) => {
            const mins = Math.round(r.duration_seconds / 60);
            const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} mins`;
            return {
              id: r.id,
              siteId: r.site_id,
              siteName: r.site_name,
              alarmType: r.alarm_type,
              severity: r.severity,
              generatedAt: r.generated_at,
              relativeTime: timeStr,
              deviceCount: r.affected_device_count,
              offlineDeviceCount: r.offline_device_count,
              lastKnownIp: r.last_known_ip,
              assignedHandler: {
                name: r.handler_name || 'NOC Field Engineer',
                phone: r.handler_phone || '+63 900 000 0000',
                telegram: r.handler_telegram || 'dict_noc',
                role: 'Field Engineer',
              },
              status: r.status,
            };
          });
        } catch (e: unknown) {
          console.error('[DB error on events.getActive]', e);
        }
      }
      return [];
    },
  },
};
