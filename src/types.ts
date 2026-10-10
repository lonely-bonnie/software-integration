export type Status =
  'ready' | 'demo' | 'unconfigured' | 'unavailable' | 'stale' | 'error' | 'disabled';
export interface Website {
  id: string;
  name: string;
  subtitle: string;
  url: string;
}
export type ThemeId = 'rider' | 'abyss' | 'warframe' | 'anime';
export type Language = 'zh-CN' | 'en';
export interface AppInfo {
  name: string;
  version: string;
  packaged: boolean;
  startupAvailable: boolean;
  platform: string;
  dataDirectory: string;
  releases: string;
  issues: string;
  configurationWarning?: string;
}
export interface Settings {
  schemaVersion: number;
  language: Language;
  timeZone: 'local' | 'UTC' | 'Asia/Shanghai';
  launchAtLogin: boolean;
  startMinimized: boolean;
  reduceMotion: boolean;
  unit: 'Mbps' | 'MB/s';
  theme: ThemeId;
  demoMode: boolean;
  refreshSeconds: number;
  modules: { traffic: boolean; codex: boolean };
  websites: Website[];
  digitalOcean: { dropletId: string; tokenConfigured: boolean };
  codexPath: string;
  closeToTray: boolean;
}
export interface Point {
  timestamp: number;
  mbps: number;
}
export interface Traffic {
  status: Status;
  message: string;
  inbound: number | null;
  outbound: number | null;
  source: string;
  sampledAt: number | null;
  series?: { inbound: Point[]; outbound: Point[] };
  cumulative?: number | null;
}
export interface Bucket {
  id: string;
  name: string;
  window: string;
  usedPercent: number;
  remainingPercent: number;
  windowDurationMins: number | null;
  resetsAt: number | null;
  sampledAt: number;
  forecastAt?: number | null;
}
export interface Quota {
  status: Status;
  message: string;
  buckets: Bucket[];
  source: string;
  sampledAt: number | null;
  account?: { type: string | null; plan: string | null };
}
export interface Snapshot {
  mode: 'live' | 'demo';
  updatedAt: number;
  traffic: Traffic;
  codex: Quota;
}
export interface Bridge {
  getInfo(): Promise<AppInfo>;
  openSupport(target: 'releases' | 'issues' | 'data'): Promise<void>;
  exportSettings(): Promise<boolean>;
  importSettings(): Promise<Settings | null>;
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings, token?: string): Promise<Settings>;
  removeToken(): Promise<Settings>;
  refresh(): Promise<Snapshot>;
  openWebsite(url: string): Promise<void>;
  windowAction(action: string): Promise<void>;
  onSnapshot(callback: (snapshot: Snapshot) => void): () => void;
}
declare global {
  interface Window {
    rider?: Bridge;
  }
}
