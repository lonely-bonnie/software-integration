import type { Bridge, Settings, Snapshot } from './types';
import { normalizeTheme } from './themes';

import defaults from '../shared/default-settings.json';
import brand from '../shared/brand.json';
import manifest from '../package.json';
export const defaultSettings = defaults as Settings;
export function makePreview(): Snapshot {
  const now = Date.now();
  const points = (offset: number) =>
    Array.from({ length: 31 }, (_, i) => ({
      timestamp: now - (30 - i) * 60000,
      mbps: offset + Math.sin(i * 0.43) * offset * 0.28 + i * 0.3,
    }));
  return {
    mode: 'demo',
    updatedAt: now,
    traffic: {
      status: 'demo',
      message: '',
      inbound: 18.4,
      outbound: 52.8,
      source: '本地演示数据',
      sampledAt: now,
      series: { inbound: points(14), outbound: points(42) },
      cumulative: null,
    },
    codex: {
      status: 'demo',
      message: '',
      source: '本地演示数据',
      sampledAt: now,
      buckets: [
        {
          id: 'demo:primary',
          name: '演示额度',
          window: 'primary',
          usedPercent: 57,
          remainingPercent: 43,
          windowDurationMins: 300,
          resetsAt: now + 8280000,
          sampledAt: now,
        },
        {
          id: 'demo:secondary',
          name: '演示额度',
          window: 'secondary',
          usedPercent: 21,
          remainingPercent: 79,
          windowDurationMins: 10080,
          resetsAt: now + 280800000,
          sampledAt: now,
        },
      ],
    },
  };
}
let previewSettings: Settings;
try {
  previewSettings = {
    ...defaultSettings,
    ...JSON.parse(localStorage.getItem('rider-preview-settings') || '{}'),
    demoMode: true,
  };
} catch {
  previewSettings = { ...defaultSettings, demoMode: true };
}
previewSettings = { ...defaultSettings, ...previewSettings };
previewSettings.theme = normalizeTheme(previewSettings.theme);
const preview: Bridge = {
  getInfo: async () => ({
    name: brand.name,
    version: manifest.version,
    packaged: false,
    startupAvailable: false,
    platform: 'browser',
    dataDirectory: '',
    releases: brand.releases,
    issues: brand.issues,
  }),
  openSupport: async (target) => {
    if (target !== 'data') window.open(brand[target], '_blank', 'noopener,noreferrer');
  },
  exportSettings: async () => false,
  importSettings: async () => null,
  getSettings: async () => structuredClone(previewSettings),
  saveSettings: async (settings) => {
    previewSettings = {
      ...settings,
      theme: normalizeTheme(settings.theme),
      demoMode: true,
      digitalOcean: { dropletId: '', tokenConfigured: false },
    };
    localStorage.setItem('rider-preview-settings', JSON.stringify(previewSettings));
    return previewSettings;
  },
  removeToken: async () => previewSettings,
  refresh: async () => makePreview(),
  openWebsite: async (url) => {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' && !parsed.username && !parsed.password)
      window.open(parsed.href, '_blank', 'noopener,noreferrer');
  },
  windowAction: async () => {},
  onSnapshot: () => () => {},
};
export const isPreview = !window.rider;
export const bridge = window.rider || preview;
