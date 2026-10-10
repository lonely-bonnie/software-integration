# AstraDesk 工程边界与扩展

## 产品分层

| 层         | 入口                                                | 职责                                        |
| ---------- | --------------------------------------------------- | ------------------------------------------- |
| 品牌与版本 | shared/brand.json、package.json                     | 品牌、仓库链接、稳定应用 ID、唯一版本号     |
| 配置       | shared/default-settings.json、electron/settings.cjs | 默认值、schema 版本、旧配置归一化、导入导出 |
| 界面       | src/App.tsx、src/components                         | 导航、页面、可预览的草稿、保存后的设置      |
| 本地化     | src/i18n.tsx、shared/english.json                   | 中文源键、英文资源、插值、日期与倒计时      |
| 模块清单   | shared/modules.json                                 | 内置模块身份、描述、数据权限边界            |
| 数据与凭据 | electron/providers.cjs、electron/main.cjs           | API 读取、限流、缓存、并发失效、DPAPI 加密  |
| 桥接       | electron/preload.cjs、src/types.ts                  | 受控 IPC、快照订阅、导入导出对话框          |
| 交付       | build/installer.nsh、scripts/release.cjs            | NSIS 安装向导、构建验证、发行包及校验和     |

配置 schema 当前为 2；升级归一化旧字段，保留有效的用户主题与账户连接。新安装默认流萤。配置来自较新 schema 时拒绝导入，防止降级破坏。损坏的原设置不会自动覆盖，恢复副本在数据目录中。

品牌更名后应用 ID `dev.riderconsole.workbench` 和用户数据位置 `%APPDATA%/rider-console` 保持稳定。这是历史兼容标识，不能随显示名称再次改动。默认不注册开机启动；用户保存后才写入当前用户的启动项。普通卸载清理该启动项并保留个人配置。

导出格式 `astradesk-profile` v1 仅包含验证后的偏好和网站。导入只加载草稿，不自动保存或注册启动项；本机 Droplet ID、Codex 路径和加密 Token 保留。

## 增加一个可信内置模块

1. 在 shared/modules.json 注册稳定 ID、双语名称、说明和能力；为设置增加开关默认值与校验迁移。
2. 在 providers.cjs 增加只读数据适配器，显式返回 ready / unconfigured / unavailable / stale / error / disabled。未知或缺失值保留 null。
3. 在 main.cjs 刷新调度中接入，处理超时、限流和配置修改期间的旧请求失效。不得将凭据暴露给渲染器。
4. 扩展 types.ts 的快照结构、受控桥接及对应展示组件。所有显示文案经过 i18n。
5. 加入针对解析与失败边界的测试，运行双语和打包验证。

当前为编译时内置模块体系，不是任意代码插件加载器。未来桌宠通过 Bridge.onSnapshot 订阅数据，主进程仍拥有连接和凭据；在实现桌宠窗口时补充进程生命周期、权限和资源预算。

## 安全与数据

窗口启用 contextIsolation / sandbox，禁用 Node integration；IPC 校验 sender、frame 和来源。外链使用系统浏览器，只允许配置中的 HTTPS 网站以及固定的计费、发布、反馈链接。导入/导出文件路径仅来自原生文件对话框。

Token 单独 Windows DPAPI 加密保存，不进入普通 JSON、导出配置或渲染器。跨电脑需要重新配置自己的 Token 和 Codex 登录。AstraDesk 不需要朋友安装 Node；Codex 监控需要朋友本机已安装并登录 Codex CLI，其他功能可以独立使用。

## 发布与验证

`npm run release:win` 执行格式、核心测试、TypeScript、Vite 构建、NSIS/便携打包，保存到同级 RiderConsole/releases/版本号。版本号只在 package.json 更新，并同步 lockfile；窗口与关于页面从同一来源读取。

打包成功后还必须验证发行 EXE：全新配置启动、中英文保存重载、四主题资产、Node 隔离、安装目录选项、桌面快捷方式两种选择、开始菜单、卸载入口、重装/升级保留配置、卸载清理程序和启动项。验证数据应保存在仓库外。

GitHub Release 发布安装 EXE、便携 EXE、SHA256SUMS 与说明。本版使用手动更新入口，不暗示后台自动更新；无签名证书。docs/ci/check.yml 是 CI 模板，当前 GitHub CLI 授权不含 workflow 权限，因此尚未启用 Actions；本地 release 检查已实际运行。
