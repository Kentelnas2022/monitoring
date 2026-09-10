export interface TelegramSettings {
  botToken: string;
  channelId: string;
  autoDispatchOnDowntime: boolean;
  notifyOnRecovery: boolean;
  alertCooldownMinutes: number;
  testStatus?: 'idle' | 'testing' | 'success' | 'failed';
}

export interface MonitoringSettings {
  ruijieApiEndpoint: string;
  ruijieAppId?: string;
  ruijieAppSecret?: string;
  ruijieSessionCookie?: string;
  googleMapsApiKey?: string;
  syncIntervalSeconds: number;
  pingThreshold: number; // consecutive failed pings before downtime
  autoRefreshDashboard: boolean;
  enableGeoTracking: boolean;
}

export interface DisplayAndSoundSettings {
  tvModeEnabled: boolean;
  audibleAlarmOnDowntime: boolean;
  soundVolume: number; // 0 to 100
  compactTableRows: boolean;
}

export interface SystemGeneralSettings {
  systemName: string;
  organization: string;
  contactEmail: string;
  nmsVersion: string;
  lastBackupDate: string;
  language: string;
  timezone: string;
  sirenAlertEnabled?: boolean;
}

export interface UserAccountSettings {
  fullName: string;
  email: string;
  username?: string;
  role: string;
  department: string;
  telegramUsername: string;
  phone: string;
  password?: string;
  twoFactorEnabled: boolean;
  twoFactorMethod: 'authenticator' | 'telegram';
  sessionTimeoutMinutes: number;
  lastLoginTime: string;
  lastLoginIp: string;
}

export interface SystemSettings {
  telegram: TelegramSettings;
  monitoring: MonitoringSettings;
  displayAndSound: DisplayAndSoundSettings;
  general: SystemGeneralSettings;
  account: UserAccountSettings;
}
