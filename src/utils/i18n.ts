export type AppLanguage = 'English' | 'Filipino' | 'Cebuano';

export interface TimezoneOption {
  id: string; // IANA identifier
  label: string; // Display label
  abbr: string; // Short code
}

export const SUPPORTED_TIMEZONES: TimezoneOption[] = [
  { id: 'Asia/Manila', label: 'Asia/Manila (PST, GMT+8)', abbr: 'PST' },
  { id: 'UTC', label: 'UTC (Universal Time, GMT+0)', abbr: 'UTC' },
  { id: 'Asia/Singapore', label: 'Asia/Singapore (SGT, GMT+8)', abbr: 'SGT' },
  { id: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, GMT+9)', abbr: 'JST' },
  { id: 'Europe/London', label: 'Europe/London (GMT/BST, GMT+0/+1)', abbr: 'GMT' },
  { id: 'America/New_York', label: 'America/New_York (EST/EDT, GMT-5/-4)', abbr: 'EST' },
  { id: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, GMT-8/-7)', abbr: 'PDT' },
];

export const SUPPORTED_LANGUAGES: { id: AppLanguage; label: string; locale: string }[] = [
  { id: 'English', label: 'English (US)', locale: 'en-US' },
  { id: 'Filipino', label: 'Filipino (Tagalog)', locale: 'fil-PH' },
  { id: 'Cebuano', label: 'Cebuano (Bisaya / Region 10)', locale: 'ceb-PH' },
];

// Translations dictionary
export const translations: Record<AppLanguage, Record<string, string>> = {
  English: {
    // Navigation & General
    navDashboard: 'Dashboard',
    navReceiver: 'Designated Area Assignment',
    navActivity: 'Activity logs',
    navSettings: 'Settings',
    navSignOut: 'Sign out',
    
    // Header Titles
    headerDashboard: 'Dashboard',
    headerReceiver: 'Designated Area Assignment',
    headerActivity: 'Activity Logs',
    headerSettings: 'Settings',

    // Settings Header & Actions
    settingsTitle: 'Settings',
    editSettings: 'Edit Settings',
    saveChanges: 'Save Changes',
    savingChanges: 'Saving...',
    cancel: 'Cancel',
    reset: 'Reset',
    exportConfig: 'Export Config',
    changesSavedToast: 'System configuration settings saved successfully.',

    // Settings Tabs
    tabGeneral: 'General',
    tabAccount: 'Account',
    tabSecurity: 'Security',
    tabNotifications: 'Notifications',
    tabCloud: 'Cloud Sync & Logs',

    // General Tab
    generalHeading: 'General Settings',
    generalSubheading: 'Manage your application information, organization details, and timezone preferences.',
    systemName: 'System Name',
    orgName: 'Organization Name',
    contactEmail: 'Official Contact Email',
    contactNumber: 'Contact Number',
    language: 'Language',
    timezone: 'Timezone',
    appBranding: 'Application Branding & System Provider',
    authorizedIntegrator: 'Authorized Ruijie Networks Enterprise Integrator',
    activeSla: 'Active SLA',

    // Account Tab
    accountHeading: 'Administrator Account Profile',
    accountSubheading: 'View and modify personal identity, agency designation, and telegram responder accounts.',
    superAdmin: 'Super Admin',
    lastLoginSession: 'Last Login Session',
    fullName: 'Full Name / Official Title',
    govEmail: 'Official Gov Email Address',
    telegramUsername: 'Telegram Username',
    department: 'Department / Regional Office',
    roleDesignation: 'System Role Designation',

    // Security Tab
    securityHeading: 'Security & Authentication Policies',
    securitySubheading: 'Update your authentication credentials, configure Two-Factor Authentication, and manage session auto-lock.',
    passwordCredentials: 'Password Credentials',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    hide: 'Hide',
    show: 'Show',
    strongSecure: 'Strong & Secure',
    twoFactorTitle: 'Two-Factor Authentication (2FA)',
    twoFactorDesc: 'Require an authorization code during login for heightened security on this monitoring portal.',
    deliveryGateway: 'Delivery Gateway:',
    sessionAutoLock: 'Session Inactivity Auto-Lock',
    sessionAutoLockDesc: 'Automatically lock the dashboard when inactive in the NOC command center.',

    // Notifications Tab
    notificationsHeading: 'Telegram Outage Notification Gateway',
    notificationsSubheading: 'Configure Telegram Bot dispatching to alert designated area personnel when sites experience downtime.',
    botToken: 'Telegram Bot API Token',
    channelId: 'Broadcast Channel / Group ID',
    connectionVerification: 'Connection Verification',
    testWebhook: 'Test webhook handshake with Telegram Bot API.',
    testBot: 'Test Bot',
    testing: 'Testing...',
    autoDispatchDowntime: 'Auto-Dispatch to Designated Area Responders on Downtime',
    autoNotifyRecovery: 'Auto-Notify on Site Connectivity Recovery',

    // Cloud Sync Tab
    cloudHeading: 'Ruijie Cloud & Sync Parameters',
    cloudSubheading: 'Manage real-time telemetry polling intervals, cloud API endpoints, and command center display modes.',
    cloudEndpoint: 'Ruijie Cloud API Gateway Endpoint',
    syncInterval: 'Sync Polling Interval',
    offlineThreshold: 'Offline Heartbeat Threshold',
    nocTvTitle: 'NOC TV / Kiosk Display Mode',
    nocTvDesc: 'Toggles fullscreen view for wall-mounted operations displays.',
    enableTv: 'Enable TV Mode',
    disableTv: 'Disable TV Mode',

    // Sidebar Cards
    systemInformation: 'System Information',
    appVersion: 'Application Version',
    lastUpdated: 'Last Updated',
    environment: 'Environment',
    status: 'Status',
    online: 'Online',
    quickActions: 'Quick Actions',
    clearCache: 'Clear Cache',
    clearCacheDesc: 'Free layout buffers & memory',
    syncData: 'Sync Platform Data',
    syncDataDesc: 'Verify Ruijie cloud & telemetry',
    needHelp: 'Need Help?',
    helpDesc: 'If you need technical assistance or database maintenance, contact our engineering support team.',
    contactSupport: 'Contact Support',

    // Stats Cards
    totalSites: 'Total Infrastructure Sites',
    liveMonitored: 'Live Monitored',
    onlineSites: 'Online Sites',
    criticalIncidents: 'Critical Incidents',
    systemHealth: 'System Health',
  },

  Filipino: {
    // Navigation & General
    navDashboard: 'Dashboard',
    navReceiver: 'Pagtatalaga ng Lugar',
    navActivity: 'Mga Tala ng Aktibidad',
    navSettings: 'Mga Setting',
    navSignOut: 'Mag-sign out',
    
    // Header Titles
    headerDashboard: 'Dashboard',
    headerReceiver: 'Pagtatalaga ng Itinalagang Lugar',
    headerActivity: 'Mga Tala ng Aktibidad',
    headerSettings: 'Mga Setting',

    // Settings Header & Actions
    settingsTitle: 'Mga Setting',
    editSettings: 'I-edit ang Mga Setting',
    saveChanges: 'I-save ang Pagbabago',
    savingChanges: 'Inise-save...',
    cancel: 'Kanselahin',
    reset: 'I-reset',
    exportConfig: 'I-export ang Config',
    changesSavedToast: 'Matagumpay na na-save ang mga setting ng sistema.',

    // Settings Tabs
    tabGeneral: 'Pangkalahatan',
    tabAccount: 'Account',
    tabSecurity: 'Seguridad',
    tabNotifications: 'Mga Abiso',
    tabCloud: 'Cloud Sync at Tala',

    // General Tab
    generalHeading: 'Pangkalahatang Setting',
    generalSubheading: 'Pamahalaan ang impormasyon ng aplikasyon, detalye ng ahensya, at kagustuhan sa timezone.',
    systemName: 'Pangalan ng Sistema',
    orgName: 'Pangalan ng Organisasyon',
    contactEmail: 'Opisyal na Email sa Pakikipag-ugnayan',
    contactNumber: 'Numero ng Telepono',
    language: 'Wika',
    timezone: 'Timezone',
    appBranding: 'Branding ng Aplikasyon at Provider ng Sistema',
    authorizedIntegrator: 'Awtorisadong Integrator ng Ruijie Networks Enterprise',
    activeSla: 'Aktibong SLA',

    // Account Tab
    accountHeading: 'Profile ng Administrator Account',
    accountSubheading: 'Tingnan at baguhin ang personal na pagkakakilanlan, ahensya, at Telegram account.',
    superAdmin: 'Super Admin',
    lastLoginSession: 'Huling Sesyon ng Pag-login',
    fullName: 'Buong Pangalan / Opisyal na Titulo',
    govEmail: 'Opisyal na Email ng Gobyerno',
    telegramUsername: 'Telegram Username',
    department: 'Kagawaran / Tanggapang Rehiyonal',
    roleDesignation: 'Pagtatalaga sa Tungkulin sa Sistema',

    // Security Tab
    securityHeading: 'Mga Patakaran sa Seguridad at Pagpapatunay',
    securitySubheading: 'I-update ang mga kredensyal sa pagpapatotoo, Two-Factor Authentication, at auto-lock.',
    passwordCredentials: 'Kredensyal ng Password',
    currentPassword: 'Kasalukuyang Password',
    newPassword: 'Bagong Password',
    confirmPassword: 'Kumpirmahin ang Password',
    hide: 'Itago',
    show: 'Ipakita',
    strongSecure: 'Matatag at Ligtas',
    twoFactorTitle: 'Two-Factor Authentication (2FA)',
    twoFactorDesc: 'Humingi ng verification code sa pag-login para sa mas mataas na seguridad ng portal.',
    deliveryGateway: 'Paraan ng Pagpapadala:',
    sessionAutoLock: 'Auto-Lock sa Hindi Paggamit ng Sesyon',
    sessionAutoLockDesc: 'Awtomatikong i-lock ang dashboard kapag hindi ginagamit sa NOC command center.',

    // Notifications Tab
    notificationsHeading: 'Telegram Outage Notification Gateway',
    notificationsSubheading: 'I-configure ang Telegram Bot para alertuhan ang mga nakatalagang tauhan tuwing may downtime.',
    botToken: 'Telegram Bot API Token',
    channelId: 'Broadcast Channel / Group ID',
    connectionVerification: 'Pagpapatunay ng Koneksyon',
    testWebhook: 'Subukan ang webhook handshake sa Telegram Bot API.',
    testBot: 'Subukan ang Bot',
    testing: 'Sinusubukan...',
    autoDispatchDowntime: 'Awtomatikong Magpadala sa Nakatalagang Tauhan kapag may Downtime',
    autoNotifyRecovery: 'Awtomatikong Mag-abiso kapag Naibalik ang Koneksyon',

    // Cloud Sync Tab
    cloudHeading: 'Mga Parameter ng Ruijie Cloud at Pag-sync',
    cloudSubheading: 'Pamahalaan ang agwat ng polling ng telemetry, cloud API endpoints, at display modes.',
    cloudEndpoint: 'Ruijie Cloud API Gateway Endpoint',
    syncInterval: 'Agwat ng Pag-sync (Polling)',
    offlineThreshold: 'Bilang ng Pagkabigo Bago Mag-offline',
    nocTvTitle: 'NOC TV / Kiosk Display Mode',
    nocTvDesc: 'I-toggle ang fullscreen view para sa mga display screen sa operasyon.',
    enableTv: 'I-on ang TV Mode',
    disableTv: 'I-off ang TV Mode',

    // Sidebar Cards
    systemInformation: 'Impormasyon ng Sistema',
    appVersion: 'Bersyon ng Aplikasyon',
    lastUpdated: 'Huling Na-update',
    environment: 'Kapaligiran',
    status: 'Katayuan',
    online: 'Aktibo (Online)',
    quickActions: 'Mabilis na Aksyon',
    clearCache: 'Linisin ang Cache',
    clearCacheDesc: 'Palayain ang layout buffers at memory',
    syncData: 'I-sync ang Data ng Platform',
    syncDataDesc: 'Suriin ang Ruijie cloud at telemetry',
    needHelp: 'Kailangan ng Tulong?',
    helpDesc: 'Kung kailangan mo ng tulong teknikal o pagpapanatili ng database, makipag-ugnayan sa aming koponan.',
    contactSupport: 'Makipag-ugnayan sa Suporta',

    // Stats Cards
    totalSites: 'Kabuuang Mga Site ng Imprastraktura',
    liveMonitored: 'Aktibong Binabantayan',
    onlineSites: 'Mga Online na Site',
    criticalIncidents: 'Mga Kritikal na Insidente',
    systemHealth: 'Kalusugan ng Sistema',
  },

  Cebuano: {
    // Navigation & General
    navDashboard: 'Dashboard',
    navReceiver: 'Pagtudlo sa Lugar',
    navActivity: 'Talaan sa Kalihokan',
    navSettings: 'Mga Setting',
    navSignOut: 'Gawas (Sign out)',
    
    // Header Titles
    headerDashboard: 'Dashboard',
    headerReceiver: 'Pagtudlo sa Gi-assign nga Lugar',
    headerActivity: 'Talaan sa Kalihokan',
    headerSettings: 'Mga Setting',

    // Settings Header & Actions
    settingsTitle: 'Mga Setting',
    editSettings: 'Usba ang Mga Setting',
    saveChanges: 'I-save ang Kausaban',
    savingChanges: 'Ginasave...',
    cancel: 'Kanselahon',
    reset: 'I-reset',
    exportConfig: 'I-export ang Config',
    changesSavedToast: 'Malamposong na-save ang mga setting sa sistema.',

    // Settings Tabs
    tabGeneral: 'Kinatibuk-an',
    tabAccount: 'Account',
    tabSecurity: 'Seguridad',
    tabNotifications: 'Mga Pahibalo',
    tabCloud: 'Cloud Sync ug Talaan',

    // General Tab
    generalHeading: 'Kinatibuk-ang Setting',
    generalSubheading: 'Dumala sa impormasyon sa aplikasyon, ahensya, ug mga gusto sa timezone.',
    systemName: 'Ngalan sa Sistema',
    orgName: 'Ngalan sa Organisasyon',
    contactEmail: 'Opisyal nga Email sa Kontak',
    contactNumber: 'Numero sa Telepono',
    language: 'Pinulongan',
    timezone: 'Timezone',
    appBranding: 'Branding sa Aplikasyon ug Provider sa Sistema',
    authorizedIntegrator: 'Awtorisadong Integrator sa Ruijie Networks Enterprise',
    activeSla: 'Aktibong SLA',

    // Account Tab
    accountHeading: 'Profile sa Administrator Account',
    accountSubheading: 'Tan-awa ug usba ang personal nga pagkatawo, ahensya, ug mga account sa Telegram.',
    superAdmin: 'Super Admin',
    lastLoginSession: 'Kataposang Sesyon sa Pag-login',
    fullName: 'Tibuok Ngalan / Opisyal nga Titulo',
    govEmail: 'Opisyal nga Email sa Gobyerno',
    telegramUsername: 'Telegram Username',
    department: 'Departamento / Opisina sa Rehiyon',
    roleDesignation: 'Pagtudlo sa Katungdanan sa Sistema',

    // Security Tab
    securityHeading: 'Mga Polisiya sa Seguridad ug Pagpamatuod',
    securitySubheading: 'I-update ang kredensyal, Two-Factor Authentication, ug pag-auto-lock sa sesyon.',
    passwordCredentials: 'Kredensyal sa Password',
    currentPassword: 'Karon nga Password',
    newPassword: 'Bag-ong Password',
    confirmPassword: 'Kumpirmaha ang Password',
    hide: 'Tagoa',
    show: 'Ipakita',
    strongSecure: 'Kusog ug Luwas',
    twoFactorTitle: 'Two-Factor Authentication (2FA)',
    twoFactorDesc: 'Mangayo ug verification code inig login para sa mas taas nga seguridad sa portal.',
    deliveryGateway: 'Pamaagi sa Pagpadala:',
    sessionAutoLock: 'Auto-Lock sa Wala Gigamit nga Sesyon',
    sessionAutoLockDesc: 'Awtomatikong i-lock ang dashboard kung walay kalihokan sa NOC command center.',

    // Notifications Tab
    notificationsHeading: 'Telegram Outage Notification Gateway',
    notificationsSubheading: 'I-configure ang Telegram Bot aron mapahibalo ang gitudlo nga tawo inig kaay downtime.',
    botToken: 'Telegram Bot API Token',
    channelId: 'Broadcast Channel / Group ID',
    connectionVerification: 'Pagsusi sa Koneksyon',
    testWebhook: 'Sulayan ang webhook handshake sa Telegram Bot API.',
    testBot: 'Sulayi ang Bot',
    testing: 'Gisulayan...',
    autoDispatchDowntime: 'Awtomatikong Magpadala sa Gitudlo nga Tawo kung may Downtime',
    autoNotifyRecovery: 'Awtomatikong Pahibalo inig Balik sa Koneksyon',

    // Cloud Sync Tab
    cloudHeading: 'Mga Parameter sa Ruijie Cloud ug Pag-sync',
    cloudSubheading: 'Dumala sa agwat sa polling sa telemetry, cloud API endpoints, ug display modes.',
    cloudEndpoint: 'Ruijie Cloud API Gateway Endpoint',
    syncInterval: 'Agwat sa Pag-sync (Polling)',
    offlineThreshold: 'Ihapa sa Pagkapakyas Bag-o Mo-offline',
    nocTvTitle: 'NOC TV / Kiosk Display Mode',
    nocTvDesc: 'I-toggle ang fullscreen view para sa mga monitor sa operasyon.',
    enableTv: 'I-on ang TV Mode',
    disableTv: 'I-off ang TV Mode',

    // Sidebar Cards
    systemInformation: 'Impormasyon sa Sistema',
    appVersion: 'Bersyon sa Aplikasyon',
    lastUpdated: 'Kataposang Gi-update',
    environment: 'Palibot',
    status: 'Kahimtang',
    online: 'Aktibo (Online)',
    quickActions: 'Daling Aksyon',
    clearCache: 'Limpyohi ang Cache',
    clearCacheDesc: 'Hawani ang memory ug layout buffers',
    syncData: 'I-sync ang Data sa Platform',
    syncDataDesc: 'Susiha ang Ruijie cloud ug telemetry',
    needHelp: 'Nagkinahanglan ug Tabang?',
    helpDesc: 'Kung nagkinahanglan ka ug teknikal nga tabang o pag-atiman sa database, kontaka ang among team.',
    contactSupport: 'Pakigkita sa Suporta',

    // Stats Cards
    totalSites: 'Kinatibuk-ang Mga Site sa Imprastraktura',
    liveMonitored: 'Aktibong Gibantayan',
    onlineSites: 'Mga Online nga Site',
    criticalIncidents: 'Kritikal nga mga Insidente',
    systemHealth: 'Kahimsog sa Sistema',
  },
};

/**
 * Returns translated string for a given key and language. Falls back to English, then key itself.
 */
export function t(key: string, language: string = 'English'): string {
  const langKey = (language as AppLanguage) in translations ? (language as AppLanguage) : 'English';
  return translations[langKey]?.[key] || translations['English']?.[key] || key;
}

/**
 * Maps app language string to BCP 47 locale
 */
export function getLocale(language: string = 'English'): string {
  switch (language) {
    case 'Filipino':
      return 'fil-PH';
    case 'Cebuano':
      return 'ceb-PH';
    case 'English':
    default:
      return 'en-US';
  }
}

/**
 * Extracts a clean IANA timezone string from stored value (e.g. 'Asia/Manila (PST, GMT+8)' -> 'Asia/Manila')
 */
export function cleanTimezone(tzString: string = 'Asia/Manila'): string {
  if (!tzString) return 'Asia/Manila';
  const found = SUPPORTED_TIMEZONES.find((tz) => tz.id === tzString || tzString.startsWith(tz.id));
  return found ? found.id : 'Asia/Manila';
}

/**
 * Returns short abbreviation code for a timezone (e.g., 'PST', 'UTC')
 */
export function getTimezoneAbbr(tzString: string = 'Asia/Manila'): string {
  const found = SUPPORTED_TIMEZONES.find((tz) => tz.id === tzString || tzString.startsWith(tz.id));
  return found ? found.abbr : 'PST';
}

/**
 * Formats a Date into a localized date string using the chosen locale and timezone
 */
export function formatLocalizedDate(
  date: Date, 
  language: string = 'English', 
  timezone: string = 'Asia/Manila',
  weekdayStyle: 'short' | 'long' = 'long'
): string {
  const locale = getLocale(language);
  const timeZone = cleanTimezone(timezone);

  try {
    return date.toLocaleDateString(locale, {
      timeZone,
      weekday: weekdayStyle,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return date.toLocaleDateString('en-US', {
      weekday: weekdayStyle,
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }
}

/**
 * Formats a Date into a localized time string (HH:MM:SS AM/PM) with chosen timezone
 */
export function formatLocalizedTime(
  date: Date, 
  language: string = 'English', 
  timezone: string = 'Asia/Manila'
): string {
  const locale = getLocale(language);
  const timeZone = cleanTimezone(timezone);

  try {
    return date.toLocaleTimeString(locale, {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }
}
