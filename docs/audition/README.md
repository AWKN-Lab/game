# 音效候选试听（Audio Audition）

用途：**在替换仓库内任何音效之前，先试听候选素材**。上一版程序合成音效效果不达标，已整体撤回；本目录只放候选与工具，不动 `audio/sfx`。

## 用法

```bash
node scripts/fetch-sfx-candidates.mjs      # 下载候选到 docs/audition/sfx/audio/（不入库）
npx serve docs/audition/sfx                # 或任意静态服务器
# 打开 http://localhost:<port>/index.html
```

## 目录

| 文件 | 说明 |
|---|---|
| `sfx/index.html` | 试听页：按事件分组，逐条播放；含「现有素材」对照 |
| `sfx/manifest.json` | 候选清单：事件、文件名、来源、原始下载地址 |
| `sfx/audio/` | 下载后的音频（已 gitignore） |

## 规则

1. **人工试听确认前，不得替换 `audio/sfx` 任何文件**；
2. 选定后在 `audio-manager.js` 的 `SFX` 表中逐事件绑定，删掉占位复用（枪声=弓箭、欢呼=点击这类）；
3. 替换后同步更新 `assets/asset-ledger.json`（`scripts/build-asset-ledger.mjs --write`）与 `npm run check` 的资产校验；
4. 服务端 MIME 已支持 `.ogg` / `.mp3`（`server/app.js`），若引入非 wav 格式无需额外改动。

## 候选来源

- OpenGameArt（CC0/CC-BY 音效条目，含真实录音：枪声、欢呼人群、钟声、雨声、海浪、风、鸟鸣、烟花、脚步、纸张、金属撞击）
- Kenney 音效包（CC0，镜像仓库 `zuujis-cc0/opengameart-kenney-sound-effect`：脚步、纸页、劈砍、金属撞击、爆裂、UI 点击/切换/悬停）
- 仓库现有素材（对照用）
