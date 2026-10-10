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
import type { Bucket, Point, Settings, Snapshot, Status, Website } from './types';

const statusLabels: Record<Status, string> = {
  ready: '已连接',
  demo: '演示数据',
  unconfigured: '等待配置',
  unavailable: '暂无数据',
  stale: '数据过期',
  error: '连接失败',
  disabled: '已停用',
};
function StatusMark({ status }: { status: Status }) {
  return (
    <span className={`status status-${status}`}>
      <i />
      {statusLabels[status]}
    </span>
  );
}
function duration(minutes: number | null) {
  if (minutes === null) return '额度窗口';
  if (minutes >= 1440) return `${+(minutes / 1440).toFixed(1)} 天窗口`;
  if (minutes >= 60) return `${+(minutes / 60).toFixed(1)} 小时窗口`;
  return `${minutes} 分钟窗口`;
}
function countdown(timestamp: number | null, now: number) {
  if (!timestamp) return '时间不可用';
  const seconds = Math.max(0, Math.floor((timestamp - now) / 1000));
  if (seconds === 0) return '等待服务端确认重置';
  const days = Math.floor(seconds / 86400),
    hours = Math.floor((seconds % 86400) / 3600),
    mins = Math.floor((seconds % 3600) / 60);
  return `${days ? `${days} 天 ` : ''}${hours} 小时 ${mins} 分`;
}
function timeLabel(timestamp: number | null) {
  return timestamp
    ? new Intl.DateTimeFormat('zh-CN', {
        timeZone: 'Asia/Shanghai',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(timestamp)
    : '尚无采样';
}
function Sparkline({ inbound = [], outbound = [] }: { inbound?: Point[]; outbound?: Point[] }) {
  const all = [...inbound, ...outbound];
  if (!all.length)
    return (
      <div className="chart-empty">
        <Activity size={28} />
        <span>连接后显示最近 30 分钟流量</span>
        <small>缺失数据不会填为零</small>
      </div>
    );
  const max = Math.max(1, ...all.map((x) => x.mbps)) * 1.18,
    start = Math.min(...all.map((x) => x.timestamp)),
    end = Math.max(start + 1, ...all.map((x) => x.timestamp));
  const points = (data: Point[]) =>
    data
      .map(
        (p) =>
          `${52 + ((p.timestamp - start) / (end - start)) * 668},${142 - (p.mbps / max) * 110}`,
      )
      .join(' ');
  return (
    <div className="chart">
      <svg viewBox="0 0 760 184" role="img" aria-label="最近三十分钟公网入站与出站速率，单位 Mbps">
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--green)" stopOpacity=".19" />
            <stop offset="100%" stopColor="var(--green)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line
              x1="52"
              x2="720"
              y1={142 - v * 110}
              y2={142 - v * 110}
              stroke="var(--line)"
              strokeDasharray="3 7"
            />
            <text x="4" y={146 - v * 110}>
              {(max * v).toFixed(0)}
            </text>
          </g>
        ))}
        <text x="3" y="18">
          Mbps
        </text>
        {outbound.length > 1 && (
          <polygon points={`52,142 ${points(outbound)} 720,142`} fill="url(#chart-fill)" />
        )}
        <polyline points={points(outbound)} stroke="var(--green)" strokeWidth="2.5" fill="none" />
        <polyline
          points={points(inbound)}
          stroke="var(--blue)"
          strokeWidth="2"
          strokeDasharray="6 4"
          fill="none"
        />
        <text x="52" y="175">
          {new Date(start).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Shanghai',
          })}
        </text>
        <text x="720" y="175" textAnchor="end">
          {new Date(end).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Shanghai',
          })}
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i className="blue-line" />
          入站
        </span>
        <span>
          <i />
          出站
        </span>
        <span>采样时间 · 北京时间</span>
      </div>
    </div>
  );
}
function QuotaWindow({ bucket, now, stale }: { bucket: Bucket; now: number; stale: boolean }) {
  return (
    <div className="quota-window">
      <div className="quota-top">
        <span>{duration(bucket.windowDurationMins)}</span>
        <span className="bucket-name">{bucket.name}</span>
      </div>
      <div className="quota-value">
        <strong>
          {bucket.remainingPercent.toFixed(0)}
          <small>%</small>
        </strong>
        <span>剩余额度</span>
      </div>
      <div
        className="quota-track"
        role="progressbar"
        aria-label={`${bucket.name} ${duration(bucket.windowDurationMins)}剩余额度`}
        aria-valuenow={bucket.remainingPercent}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <span style={{ width: `${bucket.remainingPercent}%` }} />
      </div>
      <div className="reset">
        <Radio size={13} />
        <span>{stale ? '旧快照，重置待确认' : countdown(bucket.resetsAt, now)}</span>
      </div>
      <small className="reset-absolute">
        {bucket.resetsAt ? `重置于 ${timeLabel(bucket.resetsAt)}` : '服务未提供重置时间'}
      </small>
    </div>
  );
}

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
  const doRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await bridge.refresh();
      if (result) setSnapshot(result);
    } catch {
      setError('读取数据失败，请稍后重试');
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
      .catch(() => setError('加载设置失败'));
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
      setNotice('设置已保存');
      void doRefresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };
  const open = async (url: string) => {
    try {
      await bridge.openWebsite(url);
    } catch {
      setError('无法打开网站，请检查入口配置');
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
        subtitle: '自定义服务',
        url: parsed.href,
      };
      setDraft({ ...draft, websites: [...draft.websites, site] });
      setWebsite({ name: '', url: '' });
      setError('');
    } catch {
      setError('请输入网站名称和有效的 HTTPS 网址');
    }
  };
  const traffic = snapshot?.traffic,
    quota = snapshot?.codex;
  const mode = snapshot?.mode === 'demo';
  const rate = (value: number | null | undefined) =>
    value === null || value === undefined
      ? '—'
      : (settings.unit === 'MB/s' ? value / 8 : value).toFixed(1);
  const headline = page === 'dashboard' ? '控制中心' : page === 'modules' ? '模块机库' : '系统设置';
  return (
    <div className={`app theme-${settings.theme}`}>
      <header className="titlebar">
        <div className="title-logo">
          <Shield size={15} />
          <span>RIDER CONSOLE</span>
          <span className="version">v0.1.1</span>
        </div>
        <div className="title-caption">MODULAR DESKTOP WORKBENCH</div>
        <div className="window-buttons">
          <button aria-label="最小化" onClick={() => void bridge.windowAction('minimize')}>
            <Minus size={14} />
          </button>
          <button aria-label="最大化" onClick={() => void bridge.windowAction('maximize')}>
            <Square size={12} />
          </button>
          <button
            className="window-close"
            aria-label="关闭到托盘"
            onClick={() => void bridge.windowAction('close')}
          >
            <X size={16} />
          </button>
        </div>
      </header>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand-mark">
            <img src="./rider-mark-v2.png" alt="黑红装甲与蓝色面屏标识" />
            <div>
              <strong>
                RIDER<span>CONSOLE</span>
              </strong>
              <small>你的桌面指挥中心</small>
            </div>
          </div>
          <div className="nav-label">WORKSPACE</div>
          <nav aria-label="主导航">
            {(
              [
                { id: 'dashboard', label: '控制中心', sub: 'OVERVIEW', icon: LayoutDashboard },
                { id: 'modules', label: '模块机库', sub: 'MODULES', icon: Layers3 },
                { id: 'settings', label: '系统设置', sub: 'SETTINGS', icon: Settings2 },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => {
                  setPage(item.id);
                  setNotice('');
                  setError('');
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
            <div className="system-chip">
              <i />
              <span>{isPreview ? '浏览器预览' : mode ? '演示模式' : '本机工作台'}</span>
              <small>ONLINE</small>
            </div>
            <p>服务连接 · 数据观察 · 模块扩展</p>
            <button className="exit-button" onClick={() => void bridge.windowAction('quit')}>
              <Power size={15} />
              退出软件
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
            <button
              className="refresh-button"
              onClick={() => void doRefresh()}
              disabled={refreshing}
            >
              <RefreshCw size={15} className={refreshing ? 'spin' : ''} />
              {refreshing ? '正在读取' : '刷新数据'}
            </button>
          </div>
          {(isPreview || mode) && (
            <div className="demo-banner">
              <Sparkles size={15} />
              {isPreview
                ? '浏览器预览，所有监控数字均为演示数据。'
                : '演示模式已开启，当前数字不是账户真实数据。'}
              <button onClick={() => setPage('settings')}>
                切换设置
                <ChevronRight size={13} />
              </button>
            </div>
          )}
          {error && (
            <div className="message error" role="alert">
              {error}
            </div>
          )}
          {notice && (
            <div className="message" role="status">
              <Check size={15} />
              {notice}
            </div>
          )}
          {page === 'dashboard' && (
            <>
              <section className="hero">
                <img className="hero-art" src="./rider-hero-v2.png" alt="" aria-hidden="true" />
                <div className="hero-copy">
                  <div className="hero-tag">
                    <i />
                    SYSTEM READY <span>/ PERSONAL WORKSPACE</span>
                  </div>
                  <h2>
                    所有服务。
                    <br />
                    <span>一个控制中心。</span>
                  </h2>
                  <p>从服务器流量到开发额度，让工作状态一目了然。</p>
                  <div className="hero-bottom">
                    <span>
                      <Shield size={14} />
                      本地运行
                    </span>
                    <span>
                      <Layers3 size={14} />
                      模块化扩展
                    </span>
                    <span>
                      <Radio size={14} />
                      {mode ? '演示模式' : '真实数据优先'}
                    </span>
                  </div>
                </div>
                <div className="armor-label" aria-hidden="true">
                  RIDER SYSTEM<span>BLACK / RED / PRECISION</span>
                </div>
              </section>
              <div className="section-title">
                <div>
                  <span>01</span>
                  <h2>快速入口</h2>
                  <small>QUICK ACCESS</small>
                </div>
                <button className="text-button" onClick={() => setPage('settings')}>
                  管理入口
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
                      <span>{site.subtitle}</span>
                    </div>
                    <ArrowUpRight className="website-arrow" size={19} />
                  </button>
                ))}
              </div>
              <div className="section-title">
                <div>
                  <span>02</span>
                  <h2>运行状态</h2>
                  <small>LIVE TELEMETRY</small>
                </div>
                <span className="update-stamp">
                  {snapshot ? `更新于 ${timeLabel(snapshot.updatedAt)}` : '正在建立数据连接'}
                </span>
              </div>
              <div className="monitor-grid">
                {settings.modules.traffic && (
                  <section className="panel traffic-panel">
                    <div className="panel-header">
                      <div>
                        <Activity size={17} />
                        <h3>DigitalOcean 流量</h3>
                      </div>
                      <StatusMark status={traffic?.status || 'unavailable'} />
                    </div>
                    <div className="panel-subtitle">
                      {settings.digitalOcean.dropletId
                        ? `DROPLET ${settings.digitalOcean.dropletId}`
                        : 'PUBLIC NETWORK'}
                      <span>公网接口 · 准实时监控</span>
                    </div>
                    <div className="traffic-numbers">
                      <div>
                        <span>
                          <ArrowDownLeft size={15} />
                          入站速率
                        </span>
                        <strong>
                          {rate(traffic?.inbound)}
                          <small>{settings.unit}</small>
                        </strong>
                      </div>
                      <div>
                        <span>
                          <ArrowUpRight size={15} />
                          出站速率
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
                        {traffic.message}
                        {traffic.status === 'unconfigured' && (
                          <button onClick={() => setPage('settings')}>
                            配置连接
                            <ChevronRight size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="panel-foot">
                      <span>
                        来源：{traffic?.source || 'DigitalOcean Monitoring API'}
                        <small>采样：{timeLabel(traffic?.sampledAt || null)}</small>
                      </span>
                      <button
                        className="text-button"
                        onClick={() => void open('https://cloud.digitalocean.com/account/billing')}
                      >
                        官方计费
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
                        <h3>Codex 额度</h3>
                      </div>
                      <StatusMark status={quota?.status || 'unavailable'} />
                    </div>
                    <div className="panel-subtitle">
                      DEVELOPMENT CAPACITY
                      <span>
                        {quota?.account?.plan
                          ? `${quota.account.plan.toUpperCase()} 账户`
                          : '服务端额度窗口'}
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
                        <strong>{refreshing ? '正在读取账户额度' : '额度暂不可用'}</strong>
                        <span>{quota?.message || '正在建立 Codex 数据连接'}</span>
                        <button className="text-button" onClick={() => setPage('settings')}>
                          检查连接
                          <ChevronRight size={13} />
                        </button>
                      </div>
                    )}
                    <div className="forecast">
                      <span>
                        <CircleHelp size={13} />
                        消耗趋势预测
                      </span>
                      <strong>
                        {quota?.status === 'ready' && quota.buckets.some((b) => b.forecastAt)
                          ? `预计 ${countdown(quota.buckets.find((b) => b.forecastAt)!.forecastAt!, now)} 后耗尽`
                          : '暂无可靠耗尽预测'}
                      </strong>
                    </div>
                    <div className="panel-foot">
                      <span>
                        来源：{quota?.source || 'Codex App Server'}
                        <small>采样：{timeLabel(quota?.sampledAt || null)}</small>
                      </span>
                      <Shield size={15} />
                    </div>
                  </section>
                )}
              </div>
              {!settings.modules.traffic && !settings.modules.codex && (
                <div className="empty-modules">
                  <Layers3 size={30} />
                  <p>监控模块均已停用</p>
                  <button onClick={() => setPage('modules')}>打开模块机库</button>
                </div>
              )}
              <div className="bottom-strip">
                <span>
                  <i />
                  LOCAL WORKSPACE
                </span>
                <p>观测流量与官方计费分别展示。桌宠接口已预留。</p>
                <span>v0.1.1 / PRECISION VISOR</span>
              </div>
            </>
          )}
          {page === 'modules' && (
            <>
              <div className="intro">
                <h2>按需装配你的工作台。</h2>
                <p>每个模块独立连接、独立展示，可随项目扩展。</p>
              </div>
              <div className="module-grid">
                {(
                  [
                    {
                      id: 'traffic',
                      name: 'DigitalOcean 流量',
                      description: '公网入站、出站速率与最近 30 分钟趋势。',
                      icon: Activity,
                      capability: 'MONITORING API',
                    },
                    {
                      id: 'codex',
                      name: 'Codex 额度',
                      description: '多额度窗口、官方重置倒计时与消耗趋势。',
                      icon: Cpu,
                      capability: 'LOCAL APP SERVER',
                    },
                  ] as const
                ).map((item) => (
                  <section className="module-card" key={item.id}>
                    <div className="module-icon">
                      <item.icon size={28} />
                    </div>
                    <span className="module-id">{item.capability}</span>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <div className="module-bottom">
                      <span>{settings.modules[item.id] ? '已启用' : '已停用'}</span>
                      <button
                        className={`toggle ${settings.modules[item.id] ? 'on' : ''}`}
                        role="switch"
                        aria-checked={settings.modules[item.id]}
                        aria-label={`启用 ${item.name}`}
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
                  <h3>桌宠伴侣</h3>
                  <p>后续以独立桌面窗口接收状态和提醒，点击即可打开工作台。</p>
                  <div className="module-bottom">
                    <span>接口预留</span>
                    <span className="coming">COMING NEXT</span>
                  </div>
                </section>
              </div>
              <section className="module-roadmap">
                <h3>
                  <Plus size={16} />
                  后续模块
                </h3>
                <p>服务器日月累计、Beszel / Netdata、更多网站与项目工具，可逐步接入。</p>
              </section>
            </>
          )}
          {page === 'settings' && (
            <div className="settings-grid">
              <section className="panel settings-panel">
                <h2>
                  <Cloud size={19} />
                  DigitalOcean 连接
                </h2>
                <p className="settings-note">使用只读 Token，至少包含 monitoring:read 权限。</p>
                <label>
                  Droplet ID
                  <input
                    value={draft.digitalOcean.dropletId}
                    inputMode="numeric"
                    placeholder="例如 123456789"
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
                        ? '已加密保存；留空保留原凭据'
                        : '输入只读 Token'
                    }
                    onChange={(e) => setToken(e.target.value)}
                  />
                </label>
                <div className="credential-note">
                  <Shield size={14} />
                  {settings.digitalOcean.tokenConfigured
                    ? '凭据已由 Windows 加密保存'
                    : '凭据仅在桌面版中加密保存'}
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
                          setNotice('凭据已移除');
                          void doRefresh();
                        })
                        .catch(() => {
                          setError('移除凭据失败，请稍后重试');
                        });
                    }}
                  >
                    移除保存的 Token
                  </button>
                )}
              </section>
              <section className="panel settings-panel">
                <h2>
                  <Cpu size={19} />
                  Codex 连接
                </h2>
                <p className="settings-note">自动发现本机 Codex CLI，通过官方接口只读查询。</p>
                <label>
                  Codex 可执行文件路径
                  <input
                    value={draft.codexPath}
                    placeholder="留空自动发现 codex.exe"
                    onChange={(e) => setDraft({ ...draft, codexPath: e.target.value })}
                  />
                </label>
                <p className="settings-detail">
                  请确保 CLI
                  登录的是你希望监控的账户。查询不启动推理任务；窗口长度与重置时间由服务端决定。
                </p>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.demoMode}
                    disabled={isPreview}
                    onChange={(e) => setDraft({ ...draft, demoMode: e.target.checked })}
                  />
                  <span>
                    演示模式<small>使用明确标记的本地示例数据</small>
                  </span>
                </label>
              </section>
              <section className="panel settings-panel">
                <h2>
                  <Settings2 size={19} />
                  外观与运行
                </h2>
                <div className="form-row">
                  <label>
                    界面主题
                    <select
                      value={draft.theme}
                      onChange={(e) =>
                        setDraft({ ...draft, theme: e.target.value as Settings['theme'] })
                      }
                    >
                      <option value="rider">Rider · 红色装甲</option>
                      <option value="arctic">Arctic · 蓝色装甲</option>
                    </select>
                  </label>
                  <label>
                    速率单位
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
                  刷新间隔
                  <select
                    value={draft.refreshSeconds}
                    onChange={(e) => setDraft({ ...draft, refreshSeconds: Number(e.target.value) })}
                  >
                    <option value={30}>30 秒</option>
                    <option value={60}>60 秒</option>
                    <option value={120}>120 秒</option>
                    <option value={300}>300 秒</option>
                  </select>
                </label>
                <label className="check-label">
                  <input
                    type="checkbox"
                    checked={draft.closeToTray}
                    onChange={(e) => setDraft({ ...draft, closeToTray: e.target.checked })}
                  />
                  <span>
                    关闭主窗口时收起到托盘<small>托盘菜单提供明确的退出入口</small>
                  </span>
                </label>
              </section>
              <section className="panel settings-panel websites-settings">
                <h2>
                  <ExternalLink size={19} />
                  网站入口
                </h2>
                <div className="website-edit-list">
                  {draft.websites.map((site, index) => (
                    <div key={site.id}>
                      <span>
                        <strong>{site.name}</strong>
                        <small>{site.url}</small>
                      </span>
                      <button
                        aria-label={`移除 ${site.name}`}
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
                    网站名称
                    <input
                      value={website.name}
                      onChange={(e) => setWebsite({ ...website, name: e.target.value })}
                      placeholder="例如 GitHub"
                    />
                  </label>
                  <label>
                    网址
                    <input
                      value={website.url}
                      onChange={(e) => setWebsite({ ...website, url: e.target.value })}
                      placeholder="https://github.com/"
                    />
                  </label>
                  <button className="secondary-button" onClick={addWebsite}>
                    <Plus size={15} />
                    添加入口
                  </button>
                </div>
              </section>
              <div className="save-bar">
                <span>
                  {isPreview
                    ? '浏览器预览的设置与桌面版分开保存。'
                    : '保存后应用设置并重新读取监控数据。'}
                </span>
                <button className="primary-button" disabled={saving} onClick={() => void save()}>
                  {saving ? <RefreshCw size={16} className="spin" /> : <Check size={16} />}
                  {saving ? '正在保存' : '保存设置'}
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
