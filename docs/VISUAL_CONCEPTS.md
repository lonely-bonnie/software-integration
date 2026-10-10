# Rider Console 主视觉候选

## 当前 0.1.2 · 四主题

主题已接入实际软件；下面的截图来自浏览器演示模式，数字不是账户真实数据。

| 主题        | 方向                                                         | 实际界面                                  |
| ----------- | ------------------------------------------------------------ | ----------------------------------------- |
| 假面骑士    | A + F 装甲身份，末日城市中的晨光守护者；减少荒漠与锈色       | [骑士界面](assets/theme-rider-demo.png)   |
| 深海迷航    | 明亮透光的海底世界、珊瑚与白橙潜航器                         | [海底界面](assets/theme-abyss-demo.png)   |
| Gauss Prime | 参考追动配色与运动视频，白银青蓝高速冲刺；取消静态 2077 城市 | [Gauss 界面](assets/theme-gauss-demo.png) |
| 流萤        | 暖色日光花园、奶油白、桃色、薄荷绿                           | [流萤界面](assets/theme-firefly-demo.png) |

软件图标使用独立锐角控制核心标识，与主题角色分离。[四主题选择界面](assets/themes-settings-demo.png) 支持预览与保存。Gauss 参考的是实际检查的视频片段，最终图为外观融合概念，并非游戏内皮肤的精确复刻。所有最终精确提示词、角色身份参考与视频链接见 [THEME-GENERATION-FINAL.md](concepts/THEME-GENERATION-FINAL.md)。

## 历史 0.1.1 · A + F

2026-10-10，使用内置 image_gen 生成。用户希望第一张作为主体并结合 F 的眼部，因此本轮按 A 的黑红装甲、材质和光影融合 F 的深色面屏与蓝色斜向光带，接入版本 0.1.1。E、F、G 的整套装甲未被选作主体。

### 当时接入 · A + F

![A 主体与 F 眼部方向融合](../public/rider-hero-v2.png)

保留 A 的装甲层次和右侧构图，去掉复眼纹理；首页采用大幅图片，侧栏、Windows 与托盘使用同一主视觉的脸部裁切。精确编辑提示词与来源见 [AF-FUSION-PROMPT.md](concepts/AF-FUSION-PROMPT.md)。下方保留各候选供后续迭代。

| 方案 | 方向     | 特征                                 |
| ---- | -------- | ------------------------------------ |
| E    | 黑红锐刃 | 大块切削折面、楔形面甲、红色窄视窗   |
| F    | 冰白切面 | 白色精密装甲、蓝色光带、分层硬边结构 |
| G    | 黑金锋铠 | 黑金锐边、狭长绿光视窗、尖锐肩甲     |
| A    | 绿眼装甲 | 第一张复眼概念，曲面较多             |
| B    | 琥珀光带 | 黑色面甲和单条琥珀光带，曲面较多     |
| C    | 冷蓝工业 | 蓝色面屏与白色装甲，曲面较多         |
| D    | 银红骑士 | 银色面甲与红色装甲，折面强于 A–C     |

## E · 黑红锐刃

![E 黑红锐刃](concepts/E-stealth.png)

## F · 冰白切面

![F 冰白切面](concepts/F-precision.png)

## G · 黑金锋铠

![G 黑金锋铠](concepts/G-gold.png)

## 前一组

![A 绿眼装甲](concepts/A-emerald.png)
![B 琥珀光带](concepts/B-obsidian.png)
![C 冷蓝工业](concepts/C-arctic.png)
![D 银红骑士](concepts/D-crimson.png)

候选生成提示词保存在 [PROMPTS.md](concepts/PROMPTS.md)。素材均已复制到项目目录，生成原文件保留。0.1.1 已调整首页图片布局、小尺寸标识、发行文件和桌面快捷方式图标。
