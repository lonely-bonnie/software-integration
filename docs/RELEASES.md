# AstraDesk 目录与版本管理

源码由 Git 管理；运行软件、开发依赖和发行包分开存放。本机布局：

```text
D:/software/software_integration/   # 源码、正式 tests、当前资源、工程文档
D:/software/AstraDesk/              # 安装器管理的实际程序
D:/software/AstraDesk-Dev/
  development/                     # 锁定依赖；源码 node_modules 是 Junction
  tooling/                         # 项目工具、私有登录和可复用下载缓存
  releases/                        # 每版安装 EXE、便携 EXE、SHA256、index.json
  .build/<version>/                # 临时展开程序、builder 日志、blockmap
  .validation/                     # 临时隔离自检数据；验收后清理
  Develop-AstraDesk.cmd             # 仅设置当前进程环境的开发入口
```

其他 checkout 仍可正常 `npm ci`。本机使用 `scripts/setup-development.ps1`，不要用源码内 npm ci 替换目录联接。自定义开发根目录可设置进程环境变量 `ASTRADESK_WORKSPACE`；setup、release 和 clean 使用同一变量。目录、Token、账户截图和构建 EXE 不提交 Git。

## 一次正式发布

1. 更新 package.json 的 SemVer 版本，并同步 package-lock.json；写 CHANGELOG 和 docs/releases/v版本.md。修复用 PATCH，新兼容功能用 MINOR，不兼容变更用 MAJOR。未发布稳定版前仍标记 Beta。
2. 运行 `npm run release:win`：格式、正式测试、类型、界面构建、NSIS 和便携打包。中间产物只在 `.build/<version>`。打包成功后复制两种 EXE、生成 SHA256SUMS、更新 releases/index.json；不覆盖已有版本。
3. 验证实际发行包：隔离配置启动、桥接、图片、中英文、凭据加密；涉及路径或安装身份时还须验证实际安装升级和原配置。安装器带独立且稳定的 GUID，改品牌也不重复注册安装。
   `npm run verify:migration` 使用两个独立 Electron 进程，验证设置、密钥状态和加密字节迁移后仍可解密。EXE 自检中的 tokenConfigured 应与隔离探针一致。尚未发布的候选包若验收失败，可明确移出 releases 并撤回该候选索引后修复重建；GitHub 已发布版本始终不可覆盖。
4. 运行 `npm run releases:check` 核对所有历史包的尺寸、SHA256 和校验清单。根目录只允许索引、说明和已登记的正式文件。
5. 提交并推送源码；Git 标签 v版本指向验收过的提交。GitHub Release 上传根目录中对应的安装 EXE、便携 EXE、SHA256SUMS 和版本说明。发布失败重传相同文件；需要改内容则发布新版本。
6. 保留简洁、脱敏的验证结论后运行 `npm run clean`。只将 dist、.build、.validation 送入回收站，保留源码 tests、开发依赖、工具、正式包和用户数据。

正式文件示例：`releases/AstraDesk-0.2.1-windows-x64-setup.exe`，名称包含版本、系统、架构和用途。GitHub Release 为公开下载来源，本地 releases 是可离线核对的发行归档；二进制不放 Git。

## 历史版本与更名兼容

0.2.0 起提供正式安装器；0.1.0–0.1.2 只有早期便携包，整理时标为 `legacy-portable`，原始字节和 SHA256 不变，原文件名记录在索引中。历史版本没有安装 EXE，不能将便携包伪装成安装器。旧过程素材可从 Git 历史追溯，无需占用当前工作树。

0.2.1 的运行身份为 `dev.astradesk.workbench`，用户数据为 `%APPDATA%/AstraDesk`。首次发现旧数据时，仅复制 settings.json、Windows 加密凭据和解密所需的 Local State 密钥状态，经校验后原子迁移；已有新目录优先，删除过的 Token 不会被重新导入。失败时继续读取原目录并提示。旧用户目录留作回退，不属于开发垃圾；不能在未验收时清掉。必要的旧目录名只集中在 shared/compatibility.json，安装升级 GUID 同样记录在那里并与打包配置测试核对。

测试截图、缓存、临时工具和旧展开程序不长期保留。保留当前选用资产、素材来源与最终生成记录、正式测试、各版脱敏验证结论和正式发行包。私有工具配置和用户账户数据不进入公共仓库。
