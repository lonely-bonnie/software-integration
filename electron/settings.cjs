const path = require('node:path');
const DEFAULT_SETTINGS = require('../shared/default-settings.json');
const THEME_IDS = new Set(require('../shared/themes.json').map((theme) => theme.id));

function validateSettings(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('设置格式无效');
  if (Number(input.schemaVersion) > DEFAULT_SETTINGS.schemaVersion)
    throw new Error('此配置来自较新版本，请先升级软件');
  const websites = Array.isArray(input.websites)
    ? input.websites.slice(0, 30).map((site, index) => {
        if (!site || typeof site.name !== 'string' || !site.name.trim())
          throw new Error('网站名称不能为空');
        const url = new URL(site.url);
        if (url.protocol !== 'https:' || url.username || url.password)
          throw new Error('网站须使用 HTTPS 且不能包含登录凭据');
        return {
          id: `site-${index}`,
          name: site.name.trim().slice(0, 60),
          subtitle: String(site.subtitle || '网站入口').slice(0, 100),
          url: url.href,
        };
      })
    : structuredClone(DEFAULT_SETTINGS.websites);
  const dropletId = String(input.digitalOcean?.dropletId || '').trim();
  if (dropletId && !/^\d{1,20}$/.test(dropletId)) throw new Error('Droplet ID 应为数字');
  const codexPath = typeof input.codexPath === 'string' ? input.codexPath.trim() : '';
  if (
    codexPath &&
    (!path.isAbsolute(codexPath) || !/^codex(?:\.exe)?$/i.test(path.basename(codexPath)))
  )
    throw new Error('请选择 codex.exe 的完整路径');
  return {
    schemaVersion: DEFAULT_SETTINGS.schemaVersion,
    language: input.language === 'en' ? 'en' : 'zh-CN',
    timeZone: ['UTC', 'Asia/Shanghai'].includes(input.timeZone) ? input.timeZone : 'local',
    unit: input.unit === 'MB/s' ? 'MB/s' : 'Mbps',
    theme:
      input.theme === 'arctic'
        ? 'abyss'
        : THEME_IDS.has(input.theme)
          ? input.theme
          : DEFAULT_SETTINGS.theme,
    demoMode: input.demoMode === true,
    refreshSeconds: Math.min(300, Math.max(30, Number(input.refreshSeconds) || 60)),
    modules: { traffic: input.modules?.traffic !== false, codex: input.modules?.codex !== false },
    websites,
    digitalOcean: { dropletId, tokenConfigured: false },
    codexPath,
    closeToTray: input.closeToTray !== false,
    launchAtLogin: input.launchAtLogin === true,
    startMinimized: input.startMinimized === true,
    reduceMotion: input.reduceMotion === true,
  };
}

// A profile can be shared without account credentials or machine-specific paths.
function exportProfile(settings) {
  const { digitalOcean, codexPath, ...preferences } = validateSettings(settings);
  return { format: 'astradesk-profile', version: 1, preferences };
}
function importProfile(profile, current) {
  if (
    profile?.format !== 'astradesk-profile' ||
    profile.version !== 1 ||
    !profile.preferences ||
    typeof profile.preferences !== 'object'
  )
    throw new Error('不是有效的 AstraDesk 配置文件');
  return validateSettings({
    ...profile.preferences,
    digitalOcean: current.digitalOcean,
    codexPath: current.codexPath,
  });
}
module.exports = { DEFAULT_SETTINGS, validateSettings, exportProfile, importProfile };
