# 四主题与独立软件图标生成记录

2026-10-10，Rider Console 0.1.2。所有最终图由内置 image_gen 生成并保存到 public。0.2.1 已清理未采用的草案和参考帧，历史过程可从 Git 追溯；下方精确提示词保留生成当时的原文。软件标识独立于主题，使用透明背景；角色主题图是生成的同人概念美术，并非游戏官方素材或精确的游戏内皮肤复刻。

## 视觉与视频依据

- Gauss 实际观看并检查：[追动与原皮配色展示](https://www.bilibili.com/video/BV11V411x7aB/) 的约 00:52 运动帧，白银、青蓝能量、前倾加速姿态。当时检查的参考帧未打包，整理时已清理。
- Gauss 实际观看并检查：[Gauss Prime 追动外观配色](https://www.bilibili.com/video/BV1fT4y187Fs/) 的约 00:10 白金外观片段，取金属层次与少量金色点缀，不采用大面积背翼。未宣称完整观看两段视频。
- 另外检索到 [Kresnik 皮肤比较](https://www.youtube.com/watch?v=VfT2j3e-bTI)、[Moto 皮肤比较](https://www.youtube.com/watch?v=Xmwv9f7bbaQ)。页面访问/播放不稳定，未作为实际观看的参考。[官方 Devstream 192](https://www.warframe.com/en/news/resume-devstream-192) 确认有新 Gauss Deluxe 展示。
- Gauss Prime 身份参考：[warframe-items 模型图](https://raw.githubusercontent.com/wfcd/warframe-items/master/data/img/GaussPrime.png)。最终是白银青蓝的追动风格与 Prime 细节融合概念，采用高速冲刺、动能轨迹与热能爆发，取消此前 2077 静态城市方向。
- 流萤身份参考：[角色介绍](https://www.hoyolab.com/article/29770753)、[宣传参考图转载](https://megapx-assets.dcard.tw/images/ce15a47f-a3c2-49b2-8860-e7badb546b2d/1280.jpeg)。原参考不打包。最终暖色日光花园。
- 深海方向：[Subnautica 官方截图](https://unknownworlds.com/en/news/subnautica-revealed)。最终提亮为透光海底。
- 骑士以用户已选 A 主体与 F 眼部融合方案 为编辑目标，保留装甲身份，改为末日守护者与破云晨光，取消荒漠废土方向。

## 最终资产

| 资产           | 路径                                |
| -------------- | ----------------------------------- |
| 独立透明图标   | public/astradesk-icon.png           |
| 骑士守护者     | public/themes/rider-daybreak-v4.png |
| 透光海底       | public/themes/abyss-daylight-v2.png |
| Gauss 动能冲刺 | public/themes/gauss-kinetic-v3.png  |
| 暖色流萤       | public/themes/firefly-warm-v2.png   |

## 最终精确提示词

### icon

Use case: logo-brand.
Asset type: original Windows application icon for Rider Console, independent of four switchable visual themes.
Primary request: design a striking, sharply angular, premium sci-fi software emblem. A single bold abstract R-like command glyph built from three interlocking beveled metallic blade segments and a central luminous diagonal gap, suggesting an integrated control core or portal. Clean silhouette readable at 32px and 16px. No helmet, no character face, no game logo.
Composition: centered square icon, symbol fills about 78% of canvas with comfortable padding. Transparent background outside the emblem. Thick shapes, few parts, balanced negative space.
Style: polished dimensional application badge, cool gunmetal and satin platinum faces, controlled electric cyan lighting along one edge, a small coral red accent on one separate segment. Crisp precision edges and subtle realistic material depth, not a flat generic letter.
Constraints: actual transparent alpha background, no enclosing rounded-square plate, no texture background, no drop shadow outside the mark, no tiny screws, no complex filigree, no extra symbols, no text, no watermark. One unified recognisable app mark.

### rider_heroic

Use case: identity-preserve
Asset type: wide cinematic banner artwork for Rider Console desktop dashboard, 2.4:1 landscape.
Primary request: change the environment of the selected black-and-red Kamen Rider inspired armored hero into a hopeful hero defending humanity after a catastrophe. Keep the reference's distinctive razor-sharp silver angular helmet fins, red center ridge, black mechanical segmented armor and cyan narrow angular luminous visor exactly recognizable. Keep sharp hard edges, not rounded.
Scene/backdrop: rain-washed damaged modern city at dawn, distant broken towers, clean silver-blue clouds parting with warm golden sunlight, subtle emergency shelter lights in distance, humanity rebuilding. Hero dominates right 45 percent chest-up with clear strong heroic silhouette and poised protective stance; left 50 percent is quiet atmospheric steel blue and mist with space for dark interface copy.
Style/medium: premium cinematic game key art, detailed realistic metal materials, restrained battle wear, luminous blue eye line, epic rim light and clear midtones.
Color palette: steel grey, slate blue, pearl light, small red armor accents and warm dawn highlights. Bright atmospheric background; no uniformly black background.
Constraints: preserve character identity from reference image; only adjust pose slightly and replace scene/lighting. No sand desert, no heavy rust, no orange wasteland, no skulls, no gore, no text, no watermark, no UI, no compound insect eyes. Armor and face sharply legible, hopeful and powerful.

### abyss_daylight

Use case: lighting-weather.
Asset type: wide Rider Console Subnautica-style sea-world hero background.
Input image is the PRIMARY EDIT TARGET. Keep its white-orange exploration submersible, cockpit, coral reef, translucent jellyfish, alien rock arches and right-weighted composition. Change lighting and color mood to a brighter underwater world.
Turn deep midnight-black left water into translucent sunlit aqua blue: clearly visible luminous cyan water on the LEFT, god rays and soft caustics, bright turquoise and pale blue atmosphere, soft sun shafts from the surface, a beautiful lively undersea world. Keep blue depth and readable distant reefs, not a black void. The right submersible remains crisp and luminous.
Composition: same approximately 2.4:1 wide landscape, craft and reef on RIGHT 48%, LEFT 52% is clean medium-to-light aqua water with soft haze and very faint texture suitable for DARK NAVY dashboard text. No opaque dark vignette. Preserve detailed bioluminescent coral color and the orange industrial craft accents.
Style: richly detailed cinematic underwater game concept art, Subnautica exploration aesthetic, adventurous and luminous. No text, no logos, no HUD, no UI, no watermark.

### gauss_kinetic

Use case: stylized-concept
Asset type: production landscape key art for a Gauss Prime fashion theme in Rider Console, wide 2.4:1 banner.
Primary request: Gauss Prime from Warframe using an elegant Gauss Agito/追动 inspired aerodynamic fashion appearance. Use the first image's white-silver/cyan speedster silhouette, narrow elongated pointed helmet, blade fins, layered slender kinetic armor and forward-running body language as the main appearance reference. Use image 2 only to keep Gauss Prime's Warframe biomechanical detail language and restrained small pale-gold trim, NOT its default blue/gold color scheme. Create NEW art, not a replica of either input.
Scene: a bright silver and cold-blue Orokin/Corpus sci-fi acceleration passage opening toward sky; right half dominated by Gauss caught at peak Mach Rush, leaning very far forward, one knee driving ahead, opposite leg extended behind, arms counter-swinging in a physically coherent sprint. Low three-quarter camera, dramatic perspective, clear helmet and readable torso. Cyan energy wakes, several fading silhouettes behind, white shockwave ring on floor, small amber thermal detonation far behind suggest explosive offensive power. Character is in rightmost 50 percent, not cut off at helmet. Left 45 percent clean pale-blue speed haze for software headings.
Style: high-end cinematic game concept art, crisp angular metal armor, polished ivory/silver plates, dark graphite joints, finely restrained pale-gold edges, bright cyan energy, atmospheric motion blur only on background and trails. Gauss distinctly recognizable as a sleek Warframe speedster, no generic superhero.
Palette: icy blue and luminous silver with cyan, hints of pale gold and small amber thermal accents. Mid-to-light environment, not black.
Constraints: dynamic RUNNING, not standing portrait, no Cyberpunk2077 neon city, no advertising signs, no text, no logo, no UI, no watermark from reference, no huge angel wings, no insect eyes, no gun held static, avoid default blue armor, keep one anatomically coherent figure with two arms/two legs. Exhilarating velocity and kinetic power, strong and beautiful fashion-frame silhouette.

### firefly_warm

Use case: identity-preserve / compositing.
Asset type: warm ultra-wide Rider Console anime-game theme artwork starring FIREFLY (流萤) from Honkai: Star Rail.
Input image is a character identity/outfit reference only. Use the recognizable Firefly from this image: long silver-blonde hair, her dark hairband with green ribbon decoration, luminous soft blue-pink eyes, white and mint-green dress with gold details, short dark brown technical jacket and dark gloves. Preserve her distinctive face, costume palette and hairstyle. Render in polished hand-drawn 2D anime style, clear delicate line art and beautiful cel shading.
New composition and scene: Firefly is a gentle confident upper-torso portrait on the RIGHT in a warm sunlit futuristic garden at late afternoon, softly glowing fireflies and tiny mint-blue light particles, peach-gold sunlight, pale cream sky, flowering foliage and a softly blurred warm-white city. A small mint luminous butterfly near one hand. Friendly, calm, hopeful and elegant.
Composition: approximately 2.4:1 very wide landscape. Character head and torso on RIGHT 43%, whole head and flowing hair comfortably inside frame. LEFT 57% is light creamy peach / ivory atmosphere with very faint softly blurred garden details, reserved for DARK warm-brown dashboard text. No dark empty space or black vignette.
Palette: cream, warm ivory, pastel peach, soft gold, mint green, a little sky blue; keep Firefly's original recognizable clothing colors. Bright and warm without blown-out highlights.
Constraints: create a new fan-art scene from the character reference, do not reproduce its promotional poster layout. REMOVE ALL source text and logos. No text, no stars/rating labels, no banners, no watermark, no HUD, no UI, no poster borders. No photoreal face, no 3D doll, no generic original navigator replacing Firefly.
