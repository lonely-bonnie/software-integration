# A + F 融合主视觉提示词

2026-10-10。内置 image_gen 编辑模式，A 为主体，F 只参考眼部。首轮结果仍保留复眼纹理，第二轮只修改眼部；最终采用第二轮结果。

- 输入主体：[A](A-emerald.png)
- 眼部参考：[F](F-precision.png)
- 接入资产：[rider-hero-v2.png](../../public/rider-hero-v2.png)
- 侧栏、应用与托盘图标由 `scripts/create-icon.cjs` 进行确定性的裁切、缩放和 ICO 封装。

### Initial fusion

Use case: precise-object-edit / compositing.
Asset type: cinematic hero artwork for Rider Console Windows application.
Input images: Image 1 (A, black-and-red armor with emerald compound eyes) is the PRIMARY EDIT TARGET. Image 2 (F, white angular armor with blue visor) is ONLY a supporting reference for the EYE/VISOR SHAPE. Do not use F's white body or silhouette.
Primary request: preserve A as the hero and merge only F's eye region design into it. Replace A's two rounded green compound eyes with a deeply inset dark glass, sharply faceted polygonal visor shaped like F, with a very thin crisp electric cyan-blue illuminated rim and aggressive angled brow. Fit the visor into A's recognizable central red forehead stripe and black/silver cheek armor; retain the red center divider if needed. No compound-eye honeycomb pattern.
Invariants: keep A's black metallic and red armor palette, shoulder silhouette, layered finely machined silver bevels, carbon-fiber panels, micro-scratches, screws, articulated neck, photoreal high-end cinematic rendering, three-quarter pose and dark smoky background. Do not turn the armor white, do not simplify it to coarse low-poly stone blocks, do not redesign the whole character.
Composition/framing: same ultra-wide landscape approximately 2.4:1. Hero head and upper torso on the right half, dark quiet negative space on the left for live UI text. Frame the whole pointed crown inside the top edge with a little breathing room, slightly pull the camera back if necessary. Visor remains the focal point. Strong angular brow, clean blade-like cheek edge; controlled crisp edges, not randomly spiky.
Lighting/mood: dramatic polished black-red armor, restrained cold blue eye glow against warm red rim light. Preserve physically believable material reflections and A's visual depth. Dark atmospheric cinematic, sharp, intimidating and cool.
Text: no text, no logos, no watermarks, no UI, no borders.

### Eye-region refinement (selected result)

Use case: precise-object-edit.
Asset type: Rider Console cinematic hero illustration, eye-region revision only.
Input images: Image 1 is the EDIT TARGET (black-red armor with cyan eyes), Image 2 is a supporting reference for the angular visor geometry ONLY.
Change only the helmet eye/visor region in Image 1. The current eyes are still rounded convex insect lenses. Rebuild their silhouette to match the sharply edged F visor from Image 2: inset flat dark smoked glass, straight polygonal edges, angular triangular/trapezoidal geometry, long sharp diagonal upper edge, crisp straight lower edge, pointed inner corners. The left and right glass panels can meet at the existing red center divider. Preserve the crisp thin cyan light along the slanted upper edge. Remove the honeycomb/hexagon compound-eye pattern completely and eliminate the bulbous rounded lens surface. Smooth nearly opaque smoked glass with a subtle believable reflection, like Image 2. Straight silver-black cheek bevels meet the glass at crisp corners.
Keep all surrounding armor, red forehead center stripe, black metallic shoulder and torso, finely machined silver bevels, carbon-fiber texture, micro-scratches, screws, neck, pose, lighting, cinematic smoky backdrop and wide right-weighted composition IDENTICAL to Image 1. The result must still look like the same black-red A character, just with F-inspired sharp polygonal eyes. Do not copy the white armor from Image 2.
No text, no logos, no watermarks, no UI.
