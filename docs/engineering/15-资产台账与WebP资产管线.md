# 15 · 资产台账与 WebP 资产管线

> 目的：把"美术资产的来源与权属"从关键词排查升级为可审计台账；同时统一图片格式与体积。

## 1. 为什么需要台账

`scripts/validate-ip.mjs` 只能扫**可见文本**里的 11 个关键词与 4 个遗留目录，二进制资产（图片/音频）一律跳过。这能挡住"目录里还留着 th/、yy/"这类历史残留，但挡不住：

- 文件名沿用外部 IP 角色名的音频（如 `audio/voice/fulina_*.wav`）；
- 来源不明但已进仓的美术资产（`images/characters/ghost/`、`images/characters/npc/`）；
- 已被删除关键词、但内容仍属外部作品的立绘。

**删除名称不解决版权。** 所以台账要回答的是"这个文件从哪来、能不能商用、什么时候被替换"，而不是"它叫什么名字"。

## 2. 台账结构

`assets/asset-ledger.json`（由 `npm run ledger` 生成，**必须提交**）：

| 字段 | 含义 |
|---|---|
| `path` | 仓库相对路径 |
| `kind` | image / sfx / voice / bgm / font / asset |
| `bytes` / `md5` | 体积与内容指纹（用于重复检测） |
| `referenced` | 是否被代码引用（字面引用 + 运行时动态目录） |
| `source` | self-produced / unknown |
| `original` | 是否原创；`false` 必须写 `note` 说明替换计划 |
| `status` | active / reserved（预留美术）/ replace-original（待替换）/ candidate-removal（待清理） |

## 3. CI 校验

`scripts/validate-assets.mjs`（已接入 `npm run check`）拦截四类问题：

1. 代码引用到的资产在台账里没有登记；
2. 台账条目指向的文件已不存在；
3. `original=false` 却没写替换说明；
4. 存在内容重复的资产（角色表情目录的同名同图除外——那是**待补真差分**的已知项，会以 warning 形式持续提示）。

同时它会把"待清理"资产当错误处理：要么接进产品，要么删掉，不允许长期躺在仓库里。

## 4. WebP 资产管线（2026-11-28 执行）

- 全部 `images/**` 下的 PNG/JPG 统一转换为 **WebP**（quality 86），同名双格式优先取 PNG（可能带透明通道且分辨率更高）。
- 引用点同步改写：`images/bg/*`、`images/cards/*`、`images/collectibles/*`、剧本页 `bg:` 字段、引擎动态拼接路径（`images/characters/${dir}/${expr}.webp`）。
- 引擎立绘候选顺序改为 `.webp → .png → .jpg → .jpeg`，保留老资源兜底。
- 结果：**images 由 78MB 降到 17MB**（全仓约 −60MB），首屏与立绘加载体积显著下降。
- 同时清理：内容重复的立绘 4 张、重复旁白 3 个、0 字节模型占位 1 个、遗留 onnx.json 1 个。

> 原始 PNG/JPG 仍在 git 历史里，需要回退可从历史取回。

## 5. 后续动作（台账里 status=replace-original 的 74 项）

| 范围 | 数量 | 动作 |
|---|---|---|
| `images/characters/zijin/*`、`luoshu/*` | 11 | 替换为原创子衿/洛书（当前 5 张"表情差分"实为同一张图） |
| `audio/voice/fulina_*`、`hutao_*` | 25 | 确认权属或换 GPT-SoVITS 自有音色 |
| `images/characters/npc/*`、`ghost/*` | 38 | 补授权说明或替换为原创 |

## 6. 命名与引用约定

- 图片统一 `.webp`；新增资产请直接提供 WebP，或用 `npm run ledger` 重新生成台账。
- 运行时动态选择的目录（`images/characters/{zijin,luoshu,npc,ghost}`）视为整体被引用，但**子目录**（如 `variants/`）不自动视为引用。
- 预留美术（结局场景、Q 版、备用收集品）必须写进 `scripts/build-asset-ledger.mjs` 的 `RESERVED` 列表并注明理由，否则会被判为"待清理"。
