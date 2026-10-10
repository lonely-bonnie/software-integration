# 验证记录

## 0.1.2 · 四主题与独立图标

日期：2026-10-10，Windows 11 x64。所有最终主题已打入便携 EXE，桌面快捷方式已更新。

| 检查                   | 结果                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| TypeScript / Vite 构建 | 通过                                                                                                                    |
| Node 核心测试          | 13 项通过，0 失败；新增四主题校验、资源路径、旧 Arctic 迁移与未知值回退                                                 |
| 浏览器交互             | 四主题选择、保存、重载保持；未保存的预览离开设置页后丢弃；返回页面滚动到顶部                                            |
| 浏览器布局             | 默认 1280px、940px 最小桌面宽度；四主题首页与设置页均无横向溢出，全部图片加载；截图目视检查通过，控制台无 warning/error |
| 源码与便携 EXE         | 两者启动自检退出码 0；manifest 的四张主图均可加载，IPC 设置可读，Node 隔离正常                                          |
| 数据与凭据             | live 模式；Codex ready，真实返回 1 个额度窗口；DO unconfigured；Windows safeStorage 加密往返探针通过                    |
| 应用图标               | 展开 EXE 提取出新的独立 R 控制核心标识；ProductVersion 0.1.2.0                                                          |
| 桌面快捷方式           | 仍指向固定展开 EXE；IconLocation 为 RiderConsole-v0.1.2.ico，目标与图标存在                                             |
| 退出清理               | 未发现残留的 Codex app-server --stdio 子进程                                                                            |

`RiderConsole-0.1.2-portable.exe` SHA-256：`C7F5C7989BB97A6785AF941BD9F5AB8421A3BBD2E3AD5619C6A9781C1A59495F`。

本地自检证据：`D:\software\RiderConsole\validation\source-smoke-v012` 与 `portable-smoke-v012`。真实账户截图保留本机；公共仓库 docs/assets/theme-*-demo.png 是明确标记的浏览器演示界面。Gauss 实际检查的视频片段和精确生成提示词见 [最终生成记录](concepts/THEME-GENERATION-FINAL.md)。DO 尚无真实凭据，不能宣称已完成真实服务器流量验收。其他长期验收边界沿用下方说明。

## 0.1.1 · A + F 主视觉

日期：2026-10-10，Windows 11 x64。新增资产、主界面布局与图标已接入实际便携 EXE。

| 检查                       | 结果                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| TypeScript / Vite 生产构建 | 通过                                                                                              |
| Node 核心测试              | 12 项通过，0 失败                                                                                 |
| 浏览器布局                 | 默认 1280px、940px 桌面最小宽度、600px 窄屏均无横向溢出，主图与侧栏图片加载成功；截图目视检查通过 |
| 应用图标                   | 从展开 EXE 提取图标，确认是新主视觉的蓝色面屏特写；EXE ProductVersion 为 0.1.1.0                  |
| 源码桌面与便携 EXE         | 两者启动诊断通过，图片加载、IPC 可读与 Node 隔离正常                                              |
| 数据与凭据                 | live 模式；Codex ready，实际返回 1 个额度窗口；DO unconfigured；safeStorage 加密往返探针通过      |
| 退出清理                   | 便携自检退出码 0，未发现残留的 Codex app-server --stdio 子进程                                    |
| 桌面快捷方式               | Target 指向展开 EXE，独立版本图标为 RiderConsole-v0.1.1.ico；目标及图标文件均存在                 |

`RiderConsole-0.1.1-portable.exe` SHA-256：`4DAA52A289DA283D98AFCA5DF19530BBB96B589C0D75F17B4A992CA4B3931789`。

本地证据：`D:\software\RiderConsole\validation\source-smoke-v011` 与 `portable-smoke-v011`，内含实际运行截图和脱敏 health.json。真实额度截图保留本机，公共 README 图片为明确标记的浏览器演示截图。主视觉精确提示词见 [AF-FUSION-PROMPT.md](concepts/AF-FUSION-PROMPT.md)。DO 尚无真实 Token / Droplet 联调证据；下方 0.1.0 哈希仅对应旧发行文件。

## 0.1.0 · 初版

日期：2026-10-10，Windows 11 x64。以下为实际运行结果，DO 联调边界单独列明。

| 检查                        | 结果                                                                        |
| --------------------------- | --------------------------------------------------------------------------- |
| TypeScript 与 Vite 生产构建 | 通过                                                                        |
| Node 核心测试               | 12 项通过，0 失败                                                           |
| 额度解析                    | 动态窗口、多桶、空值、重置时间单位与边界验证通过                            |
| DO 适配器                   | 用模拟响应验证缺方向、过期、异常数值、鉴权与限流；尚无真实 DO 凭据          |
| 请求竞态                    | 保存新配置后旧请求被丢弃，新配置快照被发布                                  |
| 凭据与 IPC                  | Token 不进入公开设置；拒绝错误 frame、近似文件 URL、带凭据网址及未配置网站  |
| 界面交互                    | 主题、单位、自定义网站保存、模块启停及重载通过浏览器检查                    |
| 源码桌面启动                | 界面、IPC、原始图片、Node 隔离与真实 Codex 额度通过                         |
| Windows 便携 EXE            | 启动检查通过，进程正常退出，模式为 live，DO 为 unconfigured，Codex 为 ready |
| Windows 凭据保护            | 在便携软件中验证 safeStorage 可用，加密 / 解密探针往返通过                  |

便携包 SHA-256：`644880969698D2207E36470D75CA6A085A8CA15C5B9C2BE9BFB21954DFA2F571`。

桌面启动证据与真实账户截图保留在本机 RiderConsole/validation，公共仓库仅包含明确标注的演示截图。真实 Codex 验证不包含推理调用；界面使用服务端实际返回的额度窗口，不补造其他窗口。

待后续验收：DO 真实采样与计费差异、睡眠 / 断网长时间恢复、多 Droplet、服务器月累计、桌宠、安装器、签名与长期资源开销。主窗口与托盘实际手动操作仍建议用户在常用桌面环境中试用。
