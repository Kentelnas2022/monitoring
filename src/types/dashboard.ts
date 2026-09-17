export type AlarmSeverity = 'Critical' | 'Moderate';
export type SiteStatus = 'Downtime' | 'Operational' | 'Maintenance';

export interface AssignedHandler {
  name: string;
  phone: string;
  telegram: string; // without @
  chatId?: string;
  role?: string;
  socialMedia?: string;
}

export interface SiteInfrastructure {
  id: string;
  name: string;
  code: string;
  region: string;
  province: string;
  status: SiteStatus;
  deviceCount: number;
  offlineCount: number;
  onlineCount: number;
  activeAlarmCount: number;
  alarmType?: string; // e.g. "All device offline"
  severity?: AlarmSeverity;
  downtimeDuration?: string;
  lastKnownIp: string;
  assignedHandler: AssignedHandler;
  coordinates?: { lat: number; lng: number };
  municipality?: string;
  landmark?: string;
  // Granular AP / Gateway / Switch breakdown from Ruijie Cloud devTypeDetail
  apCount?: number;
  apOffline?: number;
  gatewayCount?: number;
  gatewayOffline?: number;
  switchCount?: number;
  switchOffline?: number;
  devices?: SiteDevice[];
  egressIp?: string;
  configStatus?: string;
}

export interface SiteDevice {
  id: string;
  name: string;
  model: string;
  serialNumber: string;
  macAddress?: string;
  ipAddress?: string;
  deviceType: 'AccessPoint' | 'Gateway' | 'Switch' | string;
  status: 'Online' | 'Offline' | string;
  configStatus?: string;
  egressIp?: string;
}

export interface DowntimeEvent {
  id: string;
  siteId: string;
  siteName: string;
  alarmType: string;
  severity: AlarmSeverity;
  generatedAt: string;
  relativeTime: string;
  deviceCount: number;
  offlineDeviceCount: number;
  lastKnownIp: string;
  assignedHandler: AssignedHandler;
  status: 'Active' | 'Investigating' | 'Resolved';
}

export interface DashboardStats {
  totalProjects: number;
  connectedDevices: number;
  activeAlarms: number;
  projectsActive: number;
  projectsUnderMaintenance: number;
  devicesOnline: number;
  devicesOffline: number;
  criticalAlarms: number;
  moderateAlarms: number;
  // Granular AP / Device health breakdown
  totalAps?: number;
  onlineAps?: number;
  offlineAps?: number;
  totalGateways?: number;
  onlineGateways?: number;
  offlineGateways?: number;
  totalSwitches?: number;
  onlineSwitches?: number;
  offlineSwitches?: number;
}

export type ActivityType = 'outage' | 'assignment' | 'telegram' | 'recovery' | 'system';

export interface ActivityLog {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  timestamp: string;
  siteName?: string;
  siteCode?: string;
  personName?: string;
  telegramUsername?: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
}

