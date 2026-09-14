import { initialSystemSettings } from '@/data/mockSettings';
import { ActivityLog, AssignedHandler, SiteInfrastructure } from '@/types/dashboard';
import { hashPassword, verifyPassword } from '@/lib/auth';

// We import mysql2 dynamically or safely so the app never crashes if mysql2 is optional or building
let mysqlPool: any = null;
let poolPromise: Promise<any> | null = null;
let isConnectedToLiveDb = false;
let lastConnectionAttempt = 0;
let connectionFailed = false;

// Initialize MySQL pool safely and verify connectivity before returning
export async function getDbPool() {
  if (mysqlPool && isConnectedToLiveDb) return mysqlPool;
  if (poolPromise) return poolPromise;

  // Don't hammer a failing connection continuously on every request
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
      let candidatePool: any = null;

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

      // Verify connection with quick ping test
      const conn = await candidatePool.getConnection();
      await conn.ping();
      conn.release();

      mysqlPool = candidatePool;
      isConnectedToLiveDb = true;
      connectionFailed = false;
      console.log(`[Database] Connected successfully to live MySQL database: ${database} at ${host}:${port}`);
      return mysqlPool;
    } catch (err: any) {
      console.warn(`[Database Notice] Could not connect to live MySQL (${err.message}). Using resilient in-memory store. Check DATABASE_URL in .env.local.`);
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
let memoryAssignments: any[] = [];

// Dynamic users collection loaded exclusively from MySQL users table
let memoryUsers: any[] = [];

// In-memory store is intentionally empty on startup.
// All real data is sourced from MySQL, which is populated by the Ruijie Cloud sync.
// Configure RUIJIE_APP_ID + RUIJIE_APP_SECRET in .env.local to start live sync.
let memorySites: SiteInfrastructure[] = [];
let memoryActivityLogs: ActivityLog[] = [];
let memorySettings = { ...initialSystemSettings };
let memoryDispatches: any[] = [];

// Helper to resolve authentic municipality and landmark address from Ruijie Cloud telemetry
export function parseSiteLocation(name: string, province: string): { municipality: string; landmark?: string } {
  const n = (name || '').toUpperCase().replace(/[_\.]+/g, ' ').replace(/\s+/g, ' ').trim();
  let municipality = '';
  let landmark = '';

  // Misamis Occidental Municipalities
  if (n.includes('TANGUB')) municipality = 'Tangub City';
  else if (n.includes('OROQUIETA') || n.includes('OROQUITA')) municipality = 'Oroquieta City';
  else if (n.includes('OZAMIS') || n.includes('OZAMIZ')) municipality = 'Ozamiz City';
  else if (n.includes('BONIFACIO')) municipality = 'Bonifacio';
  else if (n.includes('CALAMBA')) municipality = 'Calamba';
  else if (n.includes('CLARIN')) municipality = 'Clarin';
  else if (n.includes('DON VIC')) municipality = 'Don Victoriano';
  else if (n.includes('JIMENEZ')) municipality = 'Jimenez';
  else if (n.includes('LOPEZ JAENA')) municipality = 'Lopez Jaena';
  else if (n.includes('PLARIDEL')) municipality = 'Plaridel';
  else if (n.includes('SAPANG DALAGA') || n.includes('SAPANG')) municipality = 'Sapang Dalaga';
  else if (n.includes('SINACABAN')) municipality = 'Sinacaban';
  else if (n.includes('TUDELA')) municipality = 'Tudela';
  else if (n.includes('ALORAN')) municipality = 'Aloran';
  else if (n.includes('CONCEPCION')) municipality = 'Concepcion';
  else if (n.includes('BALIANGAO')) municipality = 'Baliangao';
  else if (n.includes('PANAON')) municipality = 'Panaon';
  else if (n.includes('PROV CAPITOL') || n.includes('PROV HOSP OROQUIETA') || n.includes('CAPITOL')) municipality = 'Oroquieta City';
  else if (n.includes('MHARS')) municipality = 'Ozamiz City';

  // Lanao del Norte Municipalities
  else if (n.includes('KAUSWAGAN')) municipality = 'Kauswagan';
  else if (n.includes('BACOLOD')) municipality = 'Bacolod';
  else if (n.includes('BALOI') || n.includes('BALO I') || n.includes('BALO-I')) municipality = 'Baloi';
  else if (n.includes('BAROY')) municipality = 'Baroy';
  else if (n.includes('KOLAMBUGAN')) municipality = 'Kolambugan';
  else if (n.includes('LINAMON')) municipality = 'Linamon';
  else if (n.includes('MAIGO')) municipality = 'Maigo';
  else if (n.includes('MATUNGAO')) municipality = 'Matungao';
  else if (n.includes('MUNAI')) municipality = 'Munai';
  else if (n.includes('NUNUNGAN')) municipality = 'Nunungan';
  else if (n.includes('PANTAORAGAT') || n.includes('PANTAO')) municipality = 'Pantao Ragat';
  else if (n.includes('PANTAR')) municipality = 'Pantar';
  else if (n.includes('POONA')) municipality = 'Poona Piagapo';
  else if (n.includes('SALVADOR')) municipality = 'Salvador';
  else if (n.includes('SAPAD')) municipality = 'Sapad';
  else if (n.includes('SND') || n.includes('SULTAN NAGA')) municipality = 'Sultan Naga Dimaporo';
  else if (n.includes('TAGOLOAN') && (province || '').includes('Lanao')) municipality = 'Tagoloan';
  else if (n.includes('TANKAL')) municipality = 'Tankal';
  else if (n.includes('TUBOD')) municipality = 'Tubod';
  else if (n.includes('MAGSAYSAY') && (province || '').includes('Lanao')) municipality = 'Magsaysay';
  else if (n.includes('ILIGAN')) municipality = 'Iligan City';

  // Camiguin Municipalities
  else if (
    n.includes('MAMBAJAO') || n.includes('GEN HOSPITAL') || n.includes('NINOY AQUINO') || 
    n.includes('PAROLA') || n.includes('BALBAGON') || n.includes('SAN ROQUE') || 
    n.includes('YAMBAO') || n.includes('POBLACION') || n.includes('CPSC') ||
    n.includes('AIRPORT') || n.includes('CUÑA') || n.includes('ARDENT') ||
    n.includes('YUMBING') || n.includes('KATIBAWASAN') ||
    n.includes('SPORTS COMPLEX') || n.includes('NAASAG') || (n.includes('TESDA') && (province || '').includes('Camiguin'))
  ) municipality = 'Mambajao';
  else if (n.includes('SAGAY') || n.includes('BUCAS') || n.includes('ALANGILAN') || n.includes('BACNIT')) municipality = 'Sagay';
  else if (
    n.includes('CATARMAN') || n.includes('CATIBAC') || n.includes('COMPOL') || 
    n.includes('BURIAS') || n.includes('SUNKEN CEMETERY') || n.includes('OLD CHURCH RUINS') ||
    n.includes('TUASAN') || n.includes('SODA WATER') || n.includes('TANGARO') ||
    n.includes('STO NIÑO') || n.includes('BONBON')
  ) municipality = 'Catarman';
  else if (n.includes('MAHINOG') || n.includes('MANTIGUE') || n.includes('KATUNGGAN') || n.includes('SAN JOSE') || n.includes('OWAKAN')) municipality = 'Mahinog';
  else if (n.includes('GUINSILIBAN') || n.includes('BUTAY') || n.includes('CABUAN') || n.includes('CANTAAN') || n.includes('LIONG')) municipality = 'Guinsiliban';

  // Misamis Oriental & CDO
  else if (n.includes('CDO') || n.includes('CAGAYAN DE ORO') || n.includes('OJT') || n.includes('CAMP EVA') || n.includes('MULTIFACTORS') || n.includes('PATAG')) municipality = 'Cagayan de Oro City';
  else if (n.includes('EL SAL')) municipality = 'El Salvador City';
  else if (n.includes('GINGOOG')) municipality = 'Gingoog City';
  else if (n.includes('ALUBIJID')) municipality = 'Alubijid';
  else if (n.includes('BALINGOAN')) municipality = 'Balingoan';
  else if (n.includes('BALINGASAG')) municipality = 'Balingasag';
  else if (n.includes('CLAVERIA')) municipality = 'Claveria';
  else if (n.includes('INITAO')) municipality = 'Initao';
  else if (n.includes('JASAAN')) municipality = 'Jasaan';
  else if (n.includes('KINOGUITAN')) municipality = 'Kinoguitan';
  else if (n.includes('LAGUINDINGAN')) municipality = 'Laguindingan';
  else if (n.includes('LIBERTAD')) municipality = 'Libertad';
  else if (n.includes('LUGAIT')) municipality = 'Lugait';
  else if (n.includes('MAGSAYSAY')) municipality = 'Magsaysay';
  else if (n.includes('MANTICAO')) municipality = 'Manticao';
  else if (n.includes('MEDINA')) municipality = 'Medina';
  else if (n.includes('NAAWAN')) municipality = 'Naawan';
  else if (n.includes('OPOL')) municipality = 'Opol';
  else if (n.includes('SALAY')) municipality = 'Salay';
  else if (n.includes('SUGBONGCOGON')) municipality = 'Sugbongcogon';
  else if (n.includes('TAGOLOAN')) municipality = 'Tagoloan';
  else if (n.includes('TALISAYAN')) municipality = 'Talisayan';
  else if (n.includes('VILLANUEVA')) municipality = 'Villanueva';

  // Bukidnon Municipalities
  else if (n.includes('MALAYBALAY')) municipality = 'Malaybalay City';
  else if (n.includes('VALENCIA')) municipality = 'Valencia City';
  else if (n.includes('MARAMAG')) municipality = 'Maramag';
  else if (n.includes('MANOLO FORTICH') || n.includes('MANOLO')) municipality = 'Manolo Fortich';
  else if (n.includes('DON CARLOS')) municipality = 'Don Carlos';
  else if (n.includes('QUEZON')) municipality = 'Quezon';
  else if (n.includes('SUMILAO')) municipality = 'Sumilao';

  // Specific Landmarks
  if (n.includes('DONA MA HOS') || n.includes('DONA MARIA')) landmark = 'Doña Maria D. Tan Memorial Hospital';
  else if (n.includes('CITY HALL')) landmark = 'City Hall';
  else if (n.includes('MUN HALL') || n.includes('MUNICIPAL')) landmark = 'Municipal Hall';
  else if (n.includes('PROV HOSPITAL') || n.includes('PROV HOS')) landmark = 'Provincial Hospital';
  else if (n.includes('MED CENTER') || n.includes('MHARS')) landmark = 'Mayor Hilarion A. Ramiro Sr. Med Center';
  else if (n.includes('DIS HOSPITAL')) landmark = 'District Hospital';
  else if (n.includes('COMM HOS')) landmark = 'Community Hospital';
  else if (n.includes('RHU') || n.includes('RURAL HEALT')) landmark = 'Rural Health Unit';
  else if (n.includes('SHC') || n.includes('SUPER HEALTH')) landmark = 'Super Health Center';
  else if (n.includes('TESDA')) landmark = 'TESDA Center';
  else if (n.includes('CAMP EVA')) landmark = 'Camp Evangelista';
  else if (n.includes('PARK') || n.includes('PLAZA')) landmark = 'Public Plaza / Park';
  else if (n.includes('PORT') || n.includes('PAROLA')) landmark = 'Port / Parola';
  else if (n.includes('TERMINAL')) landmark = 'Transport Terminal';
  else if (n.includes('COLLEGE') || n.includes('USTP') || n.includes('SCHOOL')) landmark = 'College / University Campus';

  return { municipality: municipality || province, landmark: landmark || undefined };
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
          const [rows]: any = await pool.query(
            'SELECT id, full_name as fullName, email, username, role, status, two_factor_enabled as twoFactorEnabled, last_login_at as lastLoginAt FROM users ORDER BY created_at ASC'
          );
          return rows;
        } catch (e) {
          console.error('[DB error on users.getAll]', e);
        }
      }
      return memoryUsers.map(({ password, ...u }) => u);
    },

    async authenticate(identifier: string, passwordAttempt: string) {
      const cleanIdent = identifier.trim().toLowerCase();
      const cleanPass = passwordAttempt.trim();

      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows]: any = await pool.query(
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
          
          // Accurate bcrypt & password hash validation against MySQL database
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
        } catch (e: any) {
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
        } catch (e) {
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
          let rows: any;
          if (cleanIdent) {
            [rows] = await pool.query(
              'SELECT id, username, email, full_name, password_hash FROM users WHERE id = ? OR LOWER(username) = ? OR LOWER(email) = ? LIMIT 1',
              [cleanIdent, cleanIdent, cleanIdent]
            );
          } else {
            [rows] = await pool.query(
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

          // Generate secure bcrypt hash (salt rounds = 10)
          const newBcryptHash = hashPassword(cleanNew);

          // Update users table in MySQL
          await pool.query(
            'UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?',
            [newBcryptHash, user.id]
          );

          // Synchronize to system_settings table if configured
          await pool.query(
            'INSERT INTO system_settings (config_key, config_value, category) VALUES ("account.password", ?, "account") ON DUPLICATE KEY UPDATE config_value = ?',
            [newBcryptHash, newBcryptHash]
          ).catch(() => {});

          // Record security audit log in MySQL
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
        } catch (err: any) {
          console.error('[DB error on users.changePassword]', err);
          return { success: false, message: err.message || 'Database error updating password.' };
        }
      }

      // Memory store fallback
      const found = memoryUsers.find(
        (u) => u.id === identifier || u.username.toLowerCase() === cleanIdent || u.email.toLowerCase() === cleanIdent
      );
      if (!found) return { success: false, message: 'User account not found.' };
      if (!verifyPassword(cleanCurrent, found.password)) {
        return { success: false, message: 'Current password does not match.' };
      }
      found.password = hashPassword(cleanNew);
      return { success: true, message: 'Password updated and secured with cryptographic hash successfully!' };
    },
  },

  // 1. AREA ASSIGNMENTS
  assignments: {
    async getAll() {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows] = await pool.query(
            'SELECT id, area_name as area, person_name as personName, phone, telegram_username as telegram, telegram_chat_id as chatId, role, status FROM area_assignments ORDER BY created_at ASC'
          );
          return rows;
        } catch (e) {
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
        } catch (e) {
          console.error('[DB error on assignments.add]', e);
        }
      }

      const newItem = {
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
        } catch (e) {
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
        } catch (e) {
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
          const [rows]: any = await pool.query(`
            SELECT s.*, 
                   a.person_name as handler_name, a.phone as handler_phone, 
                   a.telegram_username as handler_telegram, a.telegram_chat_id as handler_chat_id, a.role as handler_role,
                   e.alarm_type as event_alarm_type, e.severity as event_severity,
                   e.duration_seconds
            FROM sites s
            LEFT JOIN area_assignments a ON s.assigned_handler_id = a.id
            LEFT JOIN downtime_events e ON e.site_id = s.id AND e.status = 'Active'
            ORDER BY s.status = 'Downtime' DESC, s.name ASC
          `);
          const [deviceRows]: any = await pool.query(`
            SELECT id, site_id, device_name, model, serial_number, mac_address, ip_address, device_type, status
            FROM devices
            ORDER BY device_type = 'Gateway' DESC, id ASC
          `).catch(() => [[]]);

          const devicesBySiteId = new Map<string, any[]>();
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

          return rows.map((r: any) => {
            const durationMins = r.duration_seconds ? Math.round(r.duration_seconds / 60) : 0;
            const durationLabel = durationMins >= 60 
              ? `${Math.floor(durationMins / 60)}h ${String(durationMins % 60).padStart(2, '0')}m`
              : durationMins > 0 ? `${durationMins} mins` : undefined;

            const locDetails = parseSiteLocation(r.name, r.province);

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
                name: r.handler_name || 'Unassigned',
                phone: r.handler_phone || '',
                telegram: r.handler_telegram || '',
                chatId: r.handler_chat_id || undefined,
                role: r.handler_role || 'Unassigned',
              },
            };
          });
        } catch (e) {
          console.error('[DB error on sites.getAll]', e);
        }
      }
      return [...memorySites];
    },

    async updateHandler(siteName: string, handler: AssignedHandler) {
      const pool = await getDbPool();
      if (pool) {
        try {
          // Find or create area assignment
          const [areas]: any = await pool.query('SELECT id FROM area_assignments WHERE person_name = ? LIMIT 1', [handler.name]);
          let handlerId = areas[0]?.id;
          if (!handlerId) {
            handlerId = `area-${Date.now()}`;
            await pool.query(
              'INSERT INTO area_assignments (id, area_name, person_name, phone, telegram_username, role) VALUES (?, ?, ?, ?, ?, ?)',
              [handlerId, siteName, handler.name, handler.phone, handler.telegram, handler.role || 'Designated Area Responder']
            );
          }
          await pool.query('UPDATE sites SET assigned_handler_id = ? WHERE name = ?', [handlerId, siteName]);
        } catch (e) {
          console.error('[DB error on sites.updateHandler]', e);
        }
      }

      memorySites = memorySites.map((s) => (s.name === siteName ? { ...s, assignedHandler: handler } : s));
      return true;
    },

    async updateAreaHandler(areaId: string, areaName: string, handler: AssignedHandler) {
      const pool = await getDbPool();
      const norm = areaName.toLowerCase().replace(/\s+area$/i, '').trim();
      if (pool) {
        try {
          await pool.query(
            'UPDATE sites SET assigned_handler_id = ? WHERE LOWER(province) LIKE ? OR LOWER(name) LIKE ? OR LOWER(region) LIKE ?',
            [areaId, `%${norm}%`, `%${norm}%`, `%${norm}%`]
          );
        } catch (e) {
          console.error('[DB error on sites.updateAreaHandler]', e);
        }
      }

      memorySites = memorySites.map((s) => {
        const p = (s.province || '').toLowerCase();
        const r = (s.region || '').toLowerCase();
        const n = (s.name || '').toLowerCase();
        const matches = p === norm || p.includes(norm) || norm.includes(p) || r.includes(norm) || n.includes(norm);
        return matches ? { ...s, assignedHandler: handler } : s;
      });
      return true;
    },
  },

  // 3. ACTIVITY LOGS
  logs: {
    async getAll(): Promise<ActivityLog[]> {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows]: any = await pool.query(
            'SELECT id, type, title, description, site_name as siteName, site_code as siteCode, person_name as personName, telegram_username as telegramUsername, severity, DATE_FORMAT(created_at, "%b %d, %Y %H:%i") as timestamp FROM activity_logs ORDER BY created_at DESC'
          );
          return rows;
        } catch (e) {
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
        } catch (e) {
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
        } catch (e) {
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
            const [matched]: any = await pool.query(
              'SELECT id FROM sites WHERE name = ? OR code = ? LIMIT 1',
              [data.siteName, data.siteName]
            );
            if (matched && matched[0]) {
              resolvedSiteId = matched[0].id;
            }
          }
          if (!resolvedSiteId) {
            const [firstSite]: any = await pool.query('SELECT id FROM sites LIMIT 1');
            resolvedSiteId = firstSite[0]?.id || 'site-ojt';
          }

          await pool.query(
            'INSERT INTO telegram_dispatches (id, site_id, recipient_name, telegram_username, telegram_chat_id, message_body, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, resolvedSiteId, data.recipientName, data.telegramUsername, data.chatId || null, data.messageBody, data.status, data.notes || null]
          );
        } catch (e) {
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
    async get() {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows]: any = await pool.query('SELECT config_key, config_value FROM system_settings');
          const map: Record<string, string> = {};
          rows.forEach((r: any) => { map[r.config_key] = r.config_value; });

          // Dynamically load active operator profile directly from MySQL users table
          let dbUser = null;
          try {
            const [userRows]: any = await pool.query('SELECT full_name as fullName, email, role, username FROM users ORDER BY created_at ASC LIMIT 1');
            if (userRows && userRows.length > 0) {
              dbUser = userRows[0];
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
        } catch (e) {
          console.error('[DB error on settings.get]', e);
        }
      }
      return { ...memorySettings };
    },

    async update(updated: any) {
      const pool = await getDbPool();
      if (pool) {
        try {
          const queries = [
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
        } catch (e) {
          console.error('[DB error on settings.update]', e);
        }
      }
      memorySettings = { ...memorySettings, ...updated };

      // Synchronize account profile changes with users collection
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

  // 6. DOWNTIME INCIDENTS & ALARMS (Direct from downtime_events table in MySQL)
  events: {
    async getActive() {
      const pool = await getDbPool();
      if (pool) {
        try {
          const [rows]: any = await pool.query(`
            SELECT e.*, s.name as site_name, s.code as site_code, s.province,
                   a.person_name as handler_name, a.phone as handler_phone, a.telegram_username as handler_telegram
            FROM downtime_events e
            JOIN sites s ON e.site_id = s.id
            LEFT JOIN area_assignments a ON e.assigned_handler_id = a.id
            WHERE e.status = 'Active'
            ORDER BY e.duration_seconds DESC
          `);
          return rows.map((r: any) => {
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
        } catch (e) {
          console.error('[DB error on events.getActive]', e);
        }
      }
      return [];
    },
  },
};
