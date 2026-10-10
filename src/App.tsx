import { useEffect, useState } from 'react';
import {
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  Cloud,
  Cpu,
  ExternalLink,
  Gauge,
  LayoutDashboard,
  Layers3,
  Minus,
  Plus,
  Power,
  Radio,
  RefreshCw,
  Settings2,
  Shield,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { bridge, defaultSettings, isPreview } from './bridge';
import { getTheme, themes } from './themes';
import { I18nContext, makeI18n } from './i18n';
import { GeneralSettings } from './components/GeneralSettings';
import brand from '../shared/brand.json';
import manifest from '../package.json';
import { modules } from './modules';
import { StatusMark, Sparkline, QuotaWindow } from './components/Telemetry';
import type { Settings, Snapshot, Website } from './types';

export default function App() {
  const [settings, setSettings] = useState<Settings>(structuredClone(defaultSettings));
  const [draft, setDraft] = useState<Settings>(structuredClone(defaultSettings));
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [page, setPage] = useState<'dashboard' | 'modules' | 'settings'>('dashboard');
  const [refreshing, setRefreshing] = useState(false),
    [saving, setSaving] = useState(false),
    [notice, setNotice] = useState(''),
    [error, setError] = useState(''),
    [token, setToken] = useState(''),
    [now, setNow] = useState(Date.now());
  const [website, setWebsite] = useState({ name: '', url: '' });
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [page]);
  const language = page === 'settings' ? draft.language : settings.language;
  const i18n = makeI18n(language, page === 'settings' ? draft.timeZone : settings.timeZone);
  const { t, countdown, timeLabel } = i18n;
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = brand.name;
  }, [language]);
  const navigate = (next: typeof page) => {
    if (next !== page) {
      setDraft(structuredClone(settings));
      setToken('');
    }
    setPage(next);
    setNotice('');
    setError('');
  };
  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await bridge.refresh();
      if (result) setSnapshot(result);
    } catch {
      setError(t('读取数据失败，请稍后重试'));
    } finally {
      setRefreshing(false);
    }
  };
  useEffect(() => {
    let disposed = false;
    bridge
      .getSettings()
      .then((s) => {
        if (!disposed) {
          setSettings(s);
          setDraft(structuredClone(s));
        }
      })
      .catch(() => setError(t('加载设置失败')));
    const stop = bridge.onSnapshot((s) => {
      if (!disposed) setSnapshot(s);
    });
    void doRefresh();
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      disposed = true;
      stop();
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!snapshot) return;
    const due = snapshot.codex.buckets.some(
      (b) => b.resetsAt && b.resetsAt <= now && b.sampledAt < b.resetsAt,
    );
    if (due && !refreshing && now - snapshot.updatedAt >= 60000) void doRefresh();
  }, [now]);
  const save = async (next = draft) => {
    setSaving(true);
    setError('');
    try {
      const saved = await bridge.saveSettings(next, token || undefined);
      setSettings(saved);
      setDraft(structuredClone(saved));
      setToken('');
      setSnapshot(null);
      setNotice(t('设置已保存'));
      void doRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('保存失败'));
    } finally {
      setSaving(false);
    }
  };
  const open = async (url: string) => {
    try {
      await bridge.openWebsite(url);
    } catch {
      setError(t('无法打开网站，请检查入口配置'));
    }
  };
  const toggleModule = async (key: 'traffic' | 'codex') => {
    const next = { ...settings, modules: { ...settings.modules, [key]: !settings.modules[key] } };
    await save(next);
  };
  const addWebsite = () => {
    try {
      const parsed = new URL(website.url);
      if (
        parsed.protocol !== 'https:' ||
        parsed.username ||
        parsed.password ||
        !website.name.trim()
      )
        throw new Error();
      const site: Website = {
        id: `site-${Date.now()}`,
        name: website.name.trim(),
        subtitle: t('自定义服务'),
        url: parsed.href,
      };
      setDraft({ ...draft, websites: [...draft.websites, site] });
      setWebsite({ name: '', url: '' });
      setError('');
    } catch {
      setError(t('请输入网站名称和有效的 HTTPS 网址'));
    }
  };
  const traffic = snapshot?.traffic,
    quota = snapshot?.codex;
  const mode = snapshot?.mode === 'demo';
  const rate = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : (settings.unit === 'MB/s' ? value / 8 : value).toFixed(1);
  const headline =
    page === 'dashboard' ? t('控制中心') : page === 'modules' ? t('模块机库') : t('系统设置');
  const theme = getTheme(page === 'settings' ? draft.theme : settings.theme);
  return (
    <I18nContext.Provider value={i18n}>
      <div className={`app theme-${theme.id} ${settings.reduceMotion ? 'reduce-motion' : ''}`}>
        <header className="titlebar">
          <div className="title-logo">
            <img className="title-emblem" src="./astradesk-mark.png" alt="" />
            <span>{brand.name.toUpperCase()}</span>
            <span className="version">v{manifest.version}</span>
          </div>
          <div className="title-caption">MODULAR DESKTOP WORKBENCH</div>
          <div className="window-buttons">
            <button aria-label={t('最小化')} onClick={() => void bridge.windowAction('minimize')}>
              <Minus size={14} />
            </button>
            <button aria-label={t('最大化')} onClick={() => void bridge.windowAction('maximize')}>
              <Square size={12} />
            </button>
            <button
              className="window-close"
              aria-label={t(settings.closeToTray ? '关闭到托盘' : '关闭')}
              onClick={() => void bridge.windowAction('close')}
            >
              <X size={16} />
            </button>
          </div>
        </header>
        <div className="app-shell">
          <aside className="sidebar">
            <div className="brand-mark">
              <img src="./astradesk-mark.png" alt="AstraDesk" />
              <div>
                <strong>
                  ASTRA<span>DESK</span>
                </strong>
                <small>{t(brand.tagline)}</small>
              </div>
            </div>
            <div className="nav-label">WORKSPACE</div>
            <nav aria-label={t('主导航')}>
              {(
                [
                  { id: 'dashboard', label: t('控制中心'), sub: 'OVERVIEW', icon: LayoutDashboard },
                  { id: 'modules', label: t('模块机库'), sub: 'MODULES', icon: Layers3 },
                  { id: 'settings', label: t('系统设置'), sub: 'SETTINGS', icon: Settings2 },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  className={page === item.id ? 'active' : ''}
                  onClick={() => {
                    navigate(item.id);
                  }}
                  aria-current={page === item.id ? 'page' : undefined}
                >
                  <item.icon size={19} />
                  <span>
                    {item.label}
                    <small>{item.sub}</small>
                  </span>
                  {page === item.id && <i />}
                </button>
              ))}
            </nav>
            <div className="sidebar-bottom">
              <button className="theme-switch" onClick={() => navigate('settings')}>
                <Sparkles size={14} />
                <span>{t(theme.name)}</span>
                <ChevronRight size={13} />
              </button>
              <div className="system-chip">
                <i />
                <span>{isPreview ? t('浏览器预览') : mode ? t('演示模式') : t('本机工作台')}</span>
                <small>ONLINE</small>
              </div>
              <p>{t('服务连接 · 数据观察 · 模块扩展')}</p>
              <button className="exit-button" onClick={() => void bridge.windowAction('quit')}>
                <Power size={15} />
                {t('退出软件')}
              </button>
            </div>
          </aside>
          <main>
            <div className="page-header">
              <div>
                <div className="eyebrow">
                  {page === 'dashboard'
                    ? '01 / OVERVIEW'
                    : page === 'modules'
                      ? '02 / MODULE HANGAR'
                      : '03 / SYSTEM'}
                </div>
                <h1>
                  {headline}
                  <span>
                    {' '}
                    /{' '}
                    {page === 'dashboard'
                      ? 'COMMAND CENTER'
                      : page === 'modules'
                        ? 'EXTENSIONS'
                        : 'PREFERENCES'}
                  </span>
                </h1>
              </div>
              <div className="page-actions">
                <button className="secondary-button" onClick={() => navigate('settings')}>
                  <Sparkles size={14} />
                  {t('主题')}
                </button>
                <button
                  className="refresh-button"
                  onClick={() => void doRefresh()}
                  disabled={refreshing}
                >
                  <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
                  {refreshing ? t('正在读取') : t('刷新数据')}
                </button>
              </div>
            </div>
            {(isPreview || mode) && (
              <div className="demo-banner">
                <Sparkles size={15} />
                {isPreview
                  ? t('浏览器预览，所有监控数字均为演示数据。')
                  : t('演示模式已开启，当前数字不是账户真实数据。')}
                <button onClick={() => navigate('settings')}>
                  {t('切换设置')}
                  <ChevronRight size={13} />
                </button>
              </div>
            )}
            {error && (
              <div className="message error" role="alert">
                {t(error)}
              </div>
            )}
            {notice && (
              <div className="message" role="status">
                <Check size={15} />
                {t(notice)}
              </div>
            )}
            {page === 'dashboard' && (
              <>
                <section className="hero">
                  <img className="hero-art" src={theme.artwork} alt="" aria-hidden="true" />
                  <div className="hero-copy">
                    <div className="hero-tag">
                      <i />
                      {theme.eyebrow} <span>/ PERSONAL WORKSPACE</span>
                    </div>
                    <h2>
                      {t('所有服务。')}
                      <br />
                      <span>{t('一个控制中心。')}</span>
                    </h2>
                    <p>{t('从服务器流量到开发额度，让工作状态一目了然。')}</p>
                    <div className="hero-bottom">
                      <span>
                        <Shield size={14} />
                        {t('本地运行')}
                      </span>
                      <span>
                        <Layers3 size={14} />
                        {t('模块化扩展')}
                      </span>
                      <span>
                        <Radio size={14} />
                        {mode ? t('演示模式') : t('真实数据优先')}
                      </span>
                    </div>
                  </div>
                  <div className="armor-label" aria-hidden="true">
                    {theme.subtitle}
                    <span>{theme.signature}</span>
                  </div>
                </section>
                <div className="section-title">
                  <div>
                    <span>01</span>
                    <h2>{t('快速入口')}</h2>
                    <small>QUICK ACCESS</small>
                  </div>
                  <button className="text-button" onClick={() => navigate('settings')}>
                    {t('管理入口')}
                    <ArrowUpRight size={14} />
                  </button>
                </div>
                <div className="website-grid">
                  {settings.websites.map((site) => (
                    <button
                      className="website-card"
                      key={site.id}
                      onClick={() => void open(site.url)}
                    >
                      <div
                        className={`service-icon service-${site.url.startsWith('https://cloud.digitalocean.com/') ? 'do' : site.url.startsWith('https://console.tailscale.com/') ? 'ts' : 'custom'}`}
                      >
                        {site.url.startsWith('https://cloud.digitalocean.com/') ? (
                          <Cloud size={24} />
                        ) : site.url.startsWith('https://console.tailscale.com/') ? (
                          <span className="tailscale-dots">
                            •••
                            <br />
                            •••
                            <br />
                            •••
                          </span>
                        ) : (
                          <ExternalLink size={22} />
                        )}
                      </div>
                      <div>
                        <strong>{site.name}</strong>
                        <span>{t(site.subtitle)}</span>
                      </div>
                      <ArrowUpRight className="website-arrow" size={19} />
                    </button>
                  ))}
                </div>
                <div className="section-title">
                  <div>
                    <span>02</span>
                    <h2>{t('运行状态')}</h2>
                    <small>LIVE TELEMETRY</small>
                  </div>
                  <span className="update-stamp">
                    {snapshot
                      ? t('更新于 {0}', { 0: timeLabel(snapshot.updatedAt) })
                      : t('正在建立数据连接')}
                  </span>
                </div>
                <div className="monitor-grid">
                  {settings.modules.traffic && (
                    <section className="panel traffic-panel">
                      <div className="panel-header">
                        <div>
                          <Activity size={17} />
                          <h3>{t('DigitalOcean 流量')}</h3>
                        </div>
                        <StatusMark status={traffic?.status || 'unavailable'} />
                      </div>
                      <div className="panel-subtitle">
                        {settings.digitalOcean.dropletId
                          ? `DROPLET ${settings.digitalOcean.dropletId}`
                          : 'PUBLIC NETWORK'}
                        <span>{t('公网接口 · 准实时监控')}</span>
                      </div>
                      <div className="traffic-numbers">
                        <div>
                          <span>
                            <ArrowDownLeft size={15} />
                            {t('入站速率')}
                          </span>
                          <strong>
                            {rate(traffic?.inbound)}
                            <small>{settings.unit}</small>
                          </strong>
                        </div>
                        <div>
                          <span>
                            <ArrowUpRight size={15} />
                            {t('出站速率')}
                          </span>
                          <strong>
                            {rate(traffic?.outbound)}
                            <small>{settings.unit}</small>
                          </strong>
                        </div>
                        <div className="traffic-direction">
                          <Gauge size={30} />
                          <small>NETWORK</small>
                        </div>
                      </div>
                      <Sparkline
                        inbound={traffic?.series?.inbound}
                        outbound={traffic?.series?.outbound}
                      />
                      {traffic?.message && (
                        <div className="data-message">
                          {t(traffic.message)}
                          {traffic.status === 'unconfigured' && (
                            <button onClick={() => navigate('settings')}>
                              {t('配置连接')}
                              <ChevronRight size={13} />
                            </button>
                          )}
                        </div>
                      )}
                      <div className="panel-foot">
                        <span>
                          {t('来源：')}
                          {t(traffic?.source || 'DigitalOcean Monitoring API')}
                          <small>
                            {t('采样：')}
                            {timeLabel(traffic?.sampledAt || null)}
                          </small>
                        </span>
                        <button
                          className="text-button"
                          onClick={() =>
                            void open('https://cloud.digitalocean.com/account/billing')
                          }
                        >
                          {t('官方计费')}
                          <ExternalLink size={13} />
                        </button>
                      </div>
                    </section>
                  )}
                  {settings.modules.codex && (
                    <section className="panel quota-panel">
                      <div className="panel-header">
                        <div>
                          <Cpu size={17} />
                          <h3>{t('Codex 额度')}</h3>
                        </div>
                        <StatusMark status={quota?.status || 'unavailable'} />
                      </div>
                      <div className="panel-subtitle">
                        DEVELOPMENT CAPACITY
                        <span>
                          {quota?.account?.plan
                            ? t('{0} 账户', { 0: quota.account.plan.toUpperCase() })
                            : t('服务端额度窗口')}
                        </span>
                      </div>
                      {quota?.buckets.length ? (
                        <div className="quota-grid">
                          {quota.buckets.map((bucket) => (
                            <QuotaWindow
                              key={bucket.id}
                              bucket={bucket}
                              now={now}
                              stale={quota.status === 'stale'}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="quota-empty">
                          <Cpu size={28} />
                          <strong>{refreshing ? t('正在读取账户额度') : t('额度暂不可用')}</strong>
                          <span>{t(quota?.message || t('正在建立 Codex 数据连接'))}</span>
                          <button className="text-button" onClick={() => navigate('settings')}>
                            {t('检查连接')}
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      )}
                      <div className="forecast">
                        <span>
                          <CircleHelp size={13} />
                          {t('消耗趋势预测')}
                        </span>
                        <strong>
                          {quota?.status === 'ready' && quota.buckets.some((b) => b.forecastAt)
                            ? t('预计 {0} 后耗尽', {
                                0: countdown(
                                  quota.buckets.find((b) => b.forecastAt)!.forecastAt!,
                                  now,
                                ),
                              })
                            : t('暂无可靠耗尽预测')}
                        </strong>
                      </div>
                      <div className="panel-foot">
                        <span>
                          {t('来源：')}
                          {t(quota?.source || 'Codex App Server')}
                          <small>
                            {t('采样：')}
                            {timeLabel(quota?.sampledAt || null)}
                          </small>
                        </span>
                        <Shield size={15} />
                      </div>
                    </section>
                  )}
                </div>
                {!settings.modules.traffic && !settings.modules.codex && (
                  <div className="empty-modules">
                    <Layers3 size={30} />
                    <p>{t('监控模块均已停用')}</p>
                    <button onClick={() => navigate('modules')}>{t('打开模块机库')}</button>
                  </div>
                )}
                <div className="bottom-strip">
                  <span>
                    <i />
                    LOCAL WORKSPACE
                  </span>
                  <p>{t('观测流量与官方计费分别展示。桌宠接口已预留。')}</p>
                  <span>
                    v{manifest.version} / {theme.subtitle}
                  </span>
                </div>
              </>
            )}
            {page === 'modules' && (
              <>
                <div className="intro">
                  <h2>{t('按需装配你的工作台。')}</h2>
                  <p>{t('每个模块独立连接、独立展示，可随项目扩展。')}</p>
                </div>
                <div className="module-grid">
                  {modules.map((item) => (
                    <section className="module-card" key={item.id}>
                      <div className="module-icon">
                        <item.icon size={28} />
                      </div>
                      <span className="module-id">{item.capability}</span>
                      <h3>{t(item.name)}</h3>
                      <p>{t(item.description)}</p>
                      <div className="module-bottom">
                        <span>{settings.modules[item.id] ? t('已启用') : t('已停用')}</span>
                        <button
                          className={`toggle ${settings.modules[item.id] ? 'on' : ''}`}
                          role="switch"
                          aria-checked={settings.modules[item.id]}
                          aria-label={t('启用 {0}', { 0: t(item.name) })}
                          onClick={() => void toggleModule(item.id)}
                          disabled={saving}
                        >
                          <i />
                        </button>
                      </div>
                    </section>
                  ))}
                  <section className="module-card future">
                    <div className="module-icon">
                      <Sparkles size={28} />
                    </div>
                    <span className="module-id">COMPANION INTERFACE</span>
                    <h3>{t('桌宠伴侣')}</h3>
                    <p>{t('后续以独立桌面窗口接收状态和提醒，点击即可打开工作台。')}</p>
                    <div className="module-bottom">
                      <span>{t('接口预留')}</span>
                      <span className="coming">COMING NEXT</span>
                    </div>
                  </section>
                </div>
                <section className="module-roadmap">
                  <h3>
                    <Plus size={16} />
                    {t('后续模块')}
                  </h3>
                  <p>{t('服务器日月累计、Beszel / Netdata、更多网站与项目工具，可逐步接入。')}</p>
                </section>
              </>
            )}
            {page === 'settings' && (
              <div className="settings-grid">
                <GeneralSettings
                  draft={draft}
                  settings={settings}
                  setDraft={setDraft}
                  onError={setError}
                  onNotice={setNotice}
                />
                <section className="panel settings-panel theme-settings">
                  <div className="theme-settings-heading">
                    <div>
                      <h2>
                        <Sparkles size={19} />
                        {t('主题方案')}
                      </h2>
                      <p className="settings-note">
                        {t('选择即可预览，点击“保存设置”后记住；离开此页会放弃未保存的修改。')}
                      </p>
                    </div>
                    <span className="theme-count">04 / THEMES</span>
                  </div>
                  <div className="theme-options" role="group" aria-label={t('界面主题')}>
                    {themes.map((option) => (
                      <button
                        className={`theme-option ${draft.theme === option.id ? 'selected' : ''}`}
                        key={option.id}
                        aria-label={t('选择{0}主题', { 0: t(option.name) })}
                        aria-pressed={draft.theme === option.id}
                        onClick={() => setDraft({ ...draft, theme: option.id })}
                      >
                        <img src={option.artwork} alt="" />
                        <div className="theme-option-copy">
                          <strong>
                            {t(option.name)}
                            {draft.theme === option.id && <Check size={15} />}
                          </strong>
                          <small>{option.subtitle}</small>
                          <p>{t(option.description)}</p>
                          <div className="theme-palette" aria-hidden="true">
                            {option.palette.map((color) => (
                              <i key={color} style={{ background: color }} />
                            ))}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
                <section className="panel settings-panel">
                  <h2>
                    <Cloud size={19} />
                    {t('DigitalOcean 连接')}
                  </h2>
                  <p className="settings-note">
                    {t('使用只读 Token，至少包含 monitoring:read 权限。')}
                  </p>
                  <label>
                    Droplet ID
                    <input
                      value={draft.digitalOcean.dropletId}
                      inputMode="numeric"
                      placeholder={t('例如 123456789')}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          digitalOcean: { ...draft.digitalOcean, dropletId: e.target.value },
                        })
                      }
                    />
                  </label>
                  <label>
                    Personal Access Token
                    <input
                      type="password"
                      value={token}
                      autoComplete="off"
                      disabled={isPreview}
                      placeholder={
                        settings.digitalOcean.tokenConfigured
                          ? t('已加密保存；留空保留原凭据')
                          : t('输入只读 Token')
                      }
                      onChange={(e) => setToken(e.target.value)}
                    />
                  </label>
                  <div className="credential-note">
                    <Shield size={14} />
                    {settings.digitalOcean.tokenConfigured
                      ? t('凭据已由 Windows 加密保存')
                      : t('凭据仅在桌面版中加密保存')}
                  </div>
                  {settings.digitalOcean.tokenConfigured && (
                    <button
                      className="text-button destructive"
                      onClick={() => {
                        void bridge
                          .removeToken()
                          .then((s) => {
                            setSettings(s);
                            setDraft(structuredClone(s));
                            setSnapshot(null);
                            setToken('');
                            setNotice(t('凭据已移除'));
                            void doRefresh();
                          })
                          .catch(() => {
                            setError(t('移除凭据失败，请稍后重试'));
                          });
                      }}
                    >
                      {t('移除保存的 Token')}
                    </button>
                  )}
                </section>
                <section className="panel settings-panel">
                  <h2>
                    <Cpu size={19} />
                    {t('Codex 连接')}
                  </h2>
                  <p className="settings-note">
                    {t('自动发现本机 Codex CLI，通过官方接口只读查询。')}
                  </p>
                  <label>
                    {t('Codex 可执行文件路径')}
                    <input
                      value={draft.codexPath}
                      placeholder={t('留空自动发现 codex.exe')}
                      onChange={(e) => setDraft({ ...draft, codexPath: e.target.value })}
                    />
                  </label>
                  <p className="settings-detail">
                    {t(
                      '请确保 CLI 登录的是你希望监控的账户。查询不启动推理任务；窗口长度与重置时间由服务端决定。',
                    )}
                  </p>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.demoMode}
                      disabled={isPreview}
                      onChange={(e) => setDraft({ ...draft, demoMode: e.target.checked })}
                    />
                    <span>
                      {t('演示模式')}
                      <small>{t('使用明确标记的本地示例数据')}</small>
                    </span>
                  </label>
                </section>
                <section className="panel settings-panel">
                  <h2>
                    <Settings2 size={19} />
                    {t('外观与运行')}
                  </h2>
                  <div className="form-row">
                    <label>
                      {t('速率单位')}
                      <select
                        value={draft.unit}
                        onChange={(e) =>
                          setDraft({ ...draft, unit: e.target.value as Settings['unit'] })
                        }
                      >
                        <option>Mbps</option>
                        <option>MB/s</option>
                      </select>
                    </label>
                  </div>
                  <label>
                    {t('刷新间隔')}
                    <select
                      value={draft.refreshSeconds}
                      onChange={(e) =>
                        setDraft({ ...draft, refreshSeconds: Number(e.target.value) })
                      }
                    >
                      <option value={30}>{t('30 秒')}</option>
                      <option value={60}>{t('60 秒')}</option>
                      <option value={120}>{t('120 秒')}</option>
                      <option value={300}>{t('300 秒')}</option>
                    </select>
                  </label>
                  <label className="check-label">
                    <input
                      type="checkbox"
                      checked={draft.closeToTray}
                      onChange={(e) => setDraft({ ...draft, closeToTray: e.target.checked })}
                    />
                    <span>
                      {t('关闭主窗口时收起到托盘')}
                      <small>{t('托盘菜单提供明确的退出入口')}</small>
                    </span>
                  </label>
                </section>
                <section className="panel settings-panel websites-settings">
                  <h2>
                    <ExternalLink size={19} />
                    {t('网站入口')}
                  </h2>
                  <div className="website-edit-list">
                    {draft.websites.map((site, index) => (
                      <div key={site.id}>
                        <span>
                          <strong>{site.name}</strong>
                          <small>{site.url}</small>
                        </span>
                        <button
                          aria-label={t('移除 {0}', { 0: site.name })}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              websites: draft.websites.filter((_, i) => i !== index),
                            })
                          }
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="new-website">
                    <label>
                      {t('网站名称')}
                      <input
                        value={website.name}
                        onChange={(e) => setWebsite({ ...website, name: e.target.value })}
                        placeholder={t('例如 GitHub')}
                      />
                    </label>
                    <label>
                      {t('网址')}
                      <input
                        value={website.url}
                        onChange={(e) => setWebsite({ ...website, url: e.target.value })}
                        placeholder="https://github.com/"
                      />
                    </label>
                    <button className="secondary-button" onClick={addWebsite}>
                      <Plus size={15} />
                      {t('添加入口')}
                    </button>
                  </div>
                </section>
                <div className="save-bar">
                  <span>
                    {isPreview
                      ? t('浏览器预览的设置与桌面版分开保存。')
                      : t('保存后应用设置并重新读取监控数据。')}
                  </span>
                  <button className="primary-button" disabled={saving} onClick={() => void save()}>
                    {saving ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                    {saving ? t('正在保存') : t('保存设置')}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </I18nContext.Provider>
  );
}
