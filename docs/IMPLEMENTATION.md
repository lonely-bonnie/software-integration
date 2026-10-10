# 首版实现与扩展指南

版本 0.1.1，2026-10-10。源码、运行环境和用户数据分别存放。

## 当前实现

- `electron/main.cjs`：Windows 主窗口、托盘、来源验证、IPC、刷新调度和配置。
- `electron/providers.cjs`：DigitalOcean 速率、Codex 官方额度协议、数据解析与趋势预测。
- `electron/preload.cjs`：受控接口，界面不能直接使用 Node 或读取凭据。
- `src/App.tsx`：控制中心、模块开关、设置；`src/styles.css`：装甲主题。
- `src/types.ts`：快照、额度窗口、流量、配置和桥接接口。
- `public/rider-hero-v2.png`：A 主体与 F 眼部方向的融合主视觉；`public/rider-mark-v2.png`、`electron/app-icon.png`、`electron/tray.png` 和 `build/icon.ico`：从主视觉派生的标识与图标。

普通配置保存在 Electron 用户目录 `settings.json`；DO Token 经 Electron safeStorage / Windows DPAPI 加密后单独保存。界面只能获知是否已配置，不会取得保存的 Token。浏览器预览使用独立的本地演示配置，不能输入真实 Token。

DO 每 30–300 秒读取近 30 分钟的公网 Monitoring 指标。单位为 Mbps，显示 MB/s 时除以 8。缺样本、过期与 HTTP 错误各有状态。官方计费通过独立入口打开；本版本不提供月累计或账单估算。

Codex 每次启动独立的 App Server stdio 客户端，依次 initialize / initialized / account/read / account/rateLimits/read，读完关闭子进程。不发起推理任务。成功快照缓存最多两分钟，遇到重置时间会重新查询。查询使用本机 CLI 的身份，它可能与其他设备或浏览器中的登录不同。

额度窗口和重置时间完全使用服务端返回值。趋势只在同一额度桶、同一重置周期内，至少 3 个样本、跨 5 分钟、消耗增加至少 2 个百分点且无长断档时计算；仅当预计在本周期重置前耗尽才展示。当前样本只保存在内存，软件退出后重新累积。

修改配置会递增请求版本、清除旧缓存，过时的进行中请求不再发布到界面；之后立即获取新配置的数据。测试覆盖这一竞态。

## 新模块与桌宠预留

新增网站只需要在设置页添加 HTTPS 网址。新增监控模块需要依次扩展 Settings.modules 和 Snapshot 类型、主进程的数据适配器、启停调度、模块机库与展示视图、适配器测试。目前是内置模块框架，尚无第三方插件加载器。

`Bridge.onSnapshot` 是未来桌宠可复用的只读状态订阅边界；Snapshot 提供 mode、来源、状态、采样时间和额度窗口。未来由主进程将同样的脱敏快照发给独立的透明宠物窗口，再添加受控的“打开工作台 / 打开模块”动作。当前不创建宠物窗口，不包含动画或宠物资源，也尚未定义告警事件协议。

后续优先级：服务器 vnStat 持续累计 → 多 Droplet → SQLite 历史 → 提醒 → 桌宠。每项独立验证数据口径与资源开销后接入。

## 隔离与验证

项目不修改系统 PATH、现有 Node、Python、Conda 或 Codex 配置。依赖使用锁文件；本机安装依赖位于 RiderConsole development 目录，通过源码下的 node_modules 目录联接使用。其他电脑可在源码目录正常 npm ci。

开发时 `npm run dev:desktop`；生产构建 `npm run portable:win`。图标通过 `npm run icons` 重建，使用项目已有 Electron nativeImage 裁切与缩放，无额外图像依赖。Windows 使用隐藏的 Start-Process 启动图标生成，避免同步子进程的 Chromium job-object 限制。主图放在首页右侧并在左侧叠加渐变，最小 940px 桌面窗口仍显示图片并保持正文可读。

开发诊断支持进程环境变量 RIDER_SMOKE_DIR 与 RIDER_DATA_DIR，二者必须一起指定。软件将读取自身 DOM、验证 IPC 和 Node 隔离、获取实际数据、保存本地截图及脱敏健康信息后退出。诊断文件留在运行目录外的 validation 下，不提交到公共仓库。

发布前执行 npm test、npm run build、实际打包软件启动诊断，并检查演示数据、空值、陈旧数据、凭据隔离与来源验证。DO 的真实联网验收需要用户在桌面设置页填入自己的只读 Token 和 Droplet ID；凭据不应写到源码或公共 issue。
