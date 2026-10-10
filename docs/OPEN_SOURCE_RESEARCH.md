# DigitalOcean 流量监控开源项目调研

调研日期：2026 年 10 月 10 日。选型目标是为 Windows 工作台寻找可复用的数据采集或完整监控工具。

找到能够覆盖不同部分的现成项目，但本次检索没有找到一个可以直接确认满足“Windows 模块化主体、DigitalOcean 流量、Codex 额度与后续桌宠”全部需求的成熟成品。推荐自行开发桌面主体，优先复用官方接口和成熟采集工具。以下是文档与仓库检查结论，未进行安装实测。

## 主要候选

| 项目                                                                          | 已确认的用途                                                     | 如何集成                                        | 判断                                                                 |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| [vnStat](https://github.com/vergoh/vnstat)                                    | Linux 和 BSD 网卡流量记录，五分钟、小时、日、月等历史，JSON 输出 | 服务器独立运行采集；Windows 经私网受限查询 JSON | 最适合持续累计，可避免电脑离线时丢失整段采集；不直接给出 DO 官方账单 |
| [Beszel](https://github.com/henrygd/beszel)                                   | 服务器及容器指标、历史、告警、Web 页面和 API；Hub 加 Agent       | 新增网站入口，或写 API 适配器展示选定指标       | 多服务器扩展候选；团队月度计费累计能力须另行验证                     |
| [Netdata](https://github.com/netdata/netdata)                                 | 秒级采集、网卡速率、历史、告警与 API                             | 打开其现成看板，或读取 Agent API                | 秒级和完整系统监控候选，功能较广，部署及资源开销须测量               |
| [innoaya/droplets-monitoring](https://github.com/innoaya/droplets-monitoring) | Vue 与 Bootstrap 的单页 DO 看板，支持公网入出站 Mbps 和自动刷新  | 可参考其页面及官方 API 调用；采用前须检查代码   | 直接贴近 DO 需求，但功能和维护证据较少，不作为长期主体               |

vnStat 主程序提供 JSON 查询及流量速率相关选项，vnstatd 负责持续记录；实时速率与数据库更新时间仍需分别验证，不能把查询频率当成采样频率。[项目手册](https://github.com/vergoh/vnstat/blob/master/man/vnstat.1)。

Beszel 有历史指标及 API，并且系统网络指标与容器网络指标需要按实际接口配置选择，不能直接汇总所有接口形成 DO 公网流量。[Beszel 仓库](https://github.com/henrygd/beszel)，[接口选择配置](https://www.beszel.dev/guide/environment-variables)。

Netdata Agent 为开源 GPLv3+；其当前 README 将 Netdata UI 和 Cloud 描述为闭源组件。因此可评估 Agent 数据接口和现有看板使用，不能把整个 UI 当作可以任意复制的开源界面。[许可说明](https://github.com/netdata/netdata#-license)。

DigitalOcean 专用单页项目提供将 Token 放入分享 URL 的功能。对本项目，应移除这一行为，改用后端凭据存储；同时检查浏览器存储、依赖加载、异常处理和 API 限流。仓库中有 MIT 许可证，但许可证不等同于安全或质量验证。[项目说明](https://github.com/innoaya/droplets-monitoring)。

## 仓库维护快照

以下信息来自当日 GitHub REST API 的仓库元数据。`pushed_at` 表示仓库最近 push 时间，不代表稳定版本发布时间，也不证明质量。时间转换为 Asia/Shanghai。四个候选均未标记为 archived。

| 仓库                        | 最近 push                 | GitHub 识别的许可证       |
| --------------------------- | ------------------------- | ------------------------- |
| vergoh/vnstat               | 2026 年 10 月 3 日 21:50  | GPL-2.0                   |
| henrygd/beszel              | 2026 年 10 月 10 日 02:40 | MIT                       |
| netdata/netdata             | 2026 年 10 月 10 日 08:25 | GPL-3.0，需结合各组件许可 |
| innoaya/droplets-monitoring | 2026 年 7 月 12 日 15:21  | MIT                       |

正式接入时固定已验证版本，检查发布记录和许可文本，记录是否修改或重新分发。首版优先通过命令输出或服务 API 连接已有工具，不直接复制大量采集器代码。

## 官方接口与计费边界

DigitalOcean Monitoring API 提供公网或私网、入站或出站的 Mbps 指标，可直接构建软件内的准实时看板。[Monitoring API](https://docs.digitalocean.com/reference/api/reference/monitoring/)。

DigitalOcean 的 Droplet 转移额度按团队汇集，官方计费概览每天更新。网卡统计可用于实时运行观察和累计估算，但无法保证与账单一一相等。[官方计费说明](https://docs.digitalocean.com/platform/billing/bandwidth/)。

因此首版采用官方 API 展示速率，下一步按需求接 vnStat 累计；只有用户需要完整多机监控时再部署 Beszel 或 Netdata。这一顺序控制组件数量，也保留更换数据源的空间。
