# GPT-SoVITS 语音克隆方案 - 完整离线部署指南

> 本方案用于替换 espeak-ng 的机械语音，生成接近原神角色声线的配音。
> 需要有 **NVIDIA GPU（6GB+ 显存）** 的 Windows/Linux 电脑。
> **全程离线操作**，无需科学上网。

---

## 一、硬件要求

| 配置 | 最低要求 | 推荐配置 |
|------|---------|---------|
| GPU | NVIDIA GTX 1060 6GB | RTX 3060 12GB 或更高 |
| 内存 | 16GB | 32GB |
| 硬盘 | 20GB 可用空间 | 50GB SSD |
| 系统 | Windows 10/11 或 Ubuntu 20.04+ | Windows 11 |

---

## 二、下载 GPT-SoVITS（国内离线）

### 方案 A：Windows 整合包（推荐，最简单）

整合包已包含所有依赖和预训练模型，下载后双击即可运行。

**下载地址（任选一个）：**

| 来源 | 链接 | 说明 |
|------|------|------|
| 官方 HuggingFace | https://huggingface.co/lj1995/GPT-SoVITS-windows-package/resolve/main/GPT-SoVITS-v3lora-20250228.7z | 需要科学上网 |
| 国内用户专用 | https://www.yuque.com/baicaigongchang1145haoyuangong/ib3g1e/dkxgpiy9zb96hob4#KTvnO | 语雀文档，国内直链 |
| B站 UP 主「花儿不哭」 | 关注后自动回复获取网盘链接 | 百度网盘/夸克网盘 |
| 百度网盘 | https://pan.baidu.com/s/1jxG6dvJw… | 搜索"GPT-SoVITS 整合包" |
| 夸克网盘 | https://pan.quark.cn/s/f4a3c5cd3… | 训练用整合包 |

**安装步骤：**
1. 下载 7z 压缩包（约 7.6GB）
2. 安装 [7-Zip](https://www.7-zip.org/) 解压
3. 解压到 **英文路径**（不要有中文或空格），如 `D:\GPT-SoVITS\`
4. 双击 `go-webui.bat` 启动
5. 浏览器自动打开 Web 界面 → 完成！

### 方案 B：Linux 手动安装

```bash
# 1. 克隆仓库（Gitee 镜像，国内快）
git clone https://gitee.com/cenzii/GPT-SoVITS.git
cd GPT-SoVITS

# 2. 创建 conda 环境
conda create -n GPTSoVITS python=3.10 -y
conda activate GPTSoVITS

# 3. 一键安装（自动下载模型，使用国内 ModelScope 源）
bash install.sh --device CU128 --source ModelScope

# 如果上面的命令失败，手动安装：
# pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu128
# pip install -r requirements.txt
```

### 方案 C：Docker 部署

```bash
# 拉取镜像
docker pull xxxxrt666/gpt-sovits:latest

# 启动
docker compose run --service-ports GPT-SoVITS-CU128-Lite
```

---

## 三、下载预训练模型（离线）

> 如果使用 Windows 整合包或 `install.sh --source ModelScope`，**已自动包含预训练模型，可跳过此步**。

### 必需模型（3 个）

GPT-SoVITS V3 需要以下预训练模型：

| 模型 | 用途 | 大小 |
|------|------|------|
| GPT 模型 (s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt) | 语义建模 | ~1.2GB |
| SoVITS 模型 (s2G488k.pth) | 声学建模 | ~1.2GB |
| G2PW 模型 (G2PWModel/) | 中文文本前端 | ~300MB |

### 国内下载地址

**方法 1：ModelScope（魔搭社区，推荐）**

```python
# 在 GPT-SoVITS 目录下运行
pip install modelscope
from modelscope import snapshot_download

# 下载全部预训练模型到正确位置
snapshot_download('lj1995/GPT-SoVITS', local_dir='GPT_SoVITS/pretrained_models')
```

**方法 2：语雀文档一键下载**

官方中文文档提供了所有模型的国内直链：
https://www.yuque.com/baicaigongchang1145haoyuangong/ib3g1e/dkxgpiy9zb96hob4#nVNhX

**方法 3：HuggingFace 镜像站**

```bash
# 使用 hf-mirror 镜像加速
export HF_ENDPOINT=https://hf-mirror.com

# Python 下载
from huggingface_hub import snapshot_download
snapshot_download('lj1995/GPT-SoVITS', local_dir='GPT_SoVITS/pretrained_models')
```

**方法 4：手动下载放置**

| 模型 | HuggingFace 原始地址 | 放置路径 |
|------|---------------------|---------|
| GPT + SoVITS | https://huggingface.co/lj1995/GPT-SoVITS | `GPT_SoVITS/pretrained_models/` |
| G2PW (HF) | https://huggingface.co/XXXXRT/GPT-SoVITS-Pretrained/resolve/main/G2PWModel.zip | 解压后放到 `GPT_SoVITS/text/G2PWModel/` |
| G2PW (ModelScope) | https://www.modelscope.cn/models/XXXXRT/GPT-SoVITS-Pretrained/resolve/master/G2PWModel.zip | 同上 |

### V3 额外模型（V3 版本需要）

如果使用 V3 版本，还需要：
```
GPT_SoVITS/pretrained_models/gsv-v2final-pretrained/
```
下载地址：https://huggingface.co/lj1995/GPT-SoVITS/tree/main/gsv-v2final-pretrained

### 验证模型是否正确

正确的目录结构应该是：
```
GPT_SoVITS/
├── pretrained_models/
│   ├── s1bert25hz-2kh-longer-epoch=68e-step=50232.ckpt   # GPT 模型
│   ├── s2G488k.pth                                         # SoVITS 模型
│   └── gsv-v2final-pretrained/                             # V3 额外模型
└── text/
    └── G2PWModel/                                          # 中文文本前端
        ├── ...
```

---

## 四、下载原神角色模型（离线）

社区已有大量原神角色的预训练模型，可以直接使用，无需自己训练。

### 芙宁娜/胡桃模型下载

**搜索渠道（任选）：**

| 平台 | 搜索关键词 |
|------|-----------|
| B站 | "GPT-SoVITS 芙宁娜 模型" / "GPT-SoVITS 胡桃 模型" |
| 魔搭 ModelScope | https://modelscope.cn 搜索 "GPT-SoVITS 原神" |
| 网盘搜索 | 百度/夸克/阿里云盘搜索 "GPT-SoVITS 原神 模型" |
| 即刻/小红书 | 搜索 "GPT-SoVITS 角色模型分享" |

**模型文件格式：**
- `.ckpt` 文件 → GPT 模型（放到 `GPT_weights/` 文件夹）
- `.pth` 文件 → SoVITS 模型（放到 `SoVITS_weights/` 文件夹）

**放置方法：**
```
GPT-SoVITS/
├── GPT_weights/
│   ├── fulina-e10_s2000.ckpt      # 芙宁娜 GPT 模型
│   └── hutao-e10_s2000.ckpt       # 胡桃 GPT 模型
└── SoVITS_weights/
    ├── fulina-e10_s2000.pth       # 芙宁娜 SoVITS 模型
    └── hutao-e10_s2000.pth        # 胡桃 SoVITS 模型
```

> 💡 模型文件名中 `e10` 表示 epoch 10，`s2000` 表示 step 2000。
> 数字越大通常效果越好，但文件也越大。

### NPC 角色模型

对于路易十六、罗伯斯庇尔、拿破仑等 NPC 角色：
- 社区可能没有现成模型
- **推荐方案**：使用零样本克隆（5秒参考音频即可）
- 找一段风格匹配的中文男声/女声作为参考

### 如果找不到现成模型

可以用 **零样本克隆** 替代，只需 5 秒参考音频：

| 角色 | 参考音频来源 |
|------|-------------|
| 芙宁娜 | 原神游戏内语音 → 角色界面 → 语音 → 录制 |
| 胡桃 | 同上 |
| 路易十六 | 任意法语/英语历史纪录片男声片段 |
| 罗伯斯庇尔 | 任意沉稳男声片段 |
| 拿破仑 | 任意果断男声片段 |
| 玛丽 | 任意优雅女声片段 |
| 旁白 | 任意低沉男声片段 |

---

## 五、准备参考音频（零样本克隆用）

每个角色需要 **1 段 5-15 秒的清晰语音**。

### 音频要求
- 格式：WAV（推荐）或 MP3
- 采样率：22050Hz 或以上
- 无背景音乐、无噪音
- 单人说话，无其他人声
- 时长 5-15 秒

### 存放位置
```
GPT-SoVITS/
└── references/
    ├── fulina_ref.wav
    ├── hutao_ref.wav
    ├── louis_ref.wav
    ├── robespierre_ref.wav
    ├── napoleon_ref.wav
    ├── marie_ref.wav
    └── narrator_ref.wav
```

---

## 六、启动 API 服务

```bash
cd GPT-SoVITS

# 启动 API 服务（默认端口 9880）
python api_v2.py -a 127.0.0.1 -p 9880
```

看到 `Uvicorn running on http://127.0.0.1:9880` 表示启动成功。

### 加载角色模型（如果有预训练模型）

```bash
# 加载芙宁娜模型
curl "http://127.0.0.1:9880/set_gpt_weights?weights_path=GPT_weights/fulina-e10_s2000.ckpt"
curl "http://127.0.0.1:9880/set_sovits_weights?weights_path=SoVITS_weights/fulina-e10_s2000.pth"

# 切换到胡桃模型
curl "http://127.0.0.1:9880/set_gpt_weights?weights_path=GPT_weights/hutao-e10_s2000.ckpt"
curl "http://127.0.0.1:9880/set_sovits_weights?weights_path=SoVITS_weights/hutao-e10_s2000.pth"
```

---

## 七、生成语音

### 1. 修改配置

编辑 `tools/generate_voice_gptsovits.py` 中的 `VOICE_CONFIG`：

**如果使用预训练模型（推荐）：**
```python
'fulina': {
    'gpt_weights': 'GPT_weights/fulina-e10_s2000.ckpt',
    'sovits_weights': 'SoVITS_weights/fulina-e10_s2000.pth',
    'speed_factor': 1.0,
    'temperature': 1.0,
    'desc': '芙宁娜 - 戏剧腔调，水神'
},
```

**如果使用零样本克隆（参考音频）：**
```python
'fulina': {
    'ref_audio_path': 'D:/GPT-SoVITS/references/fulina_ref.wav',
    'prompt_text': '我是芙宁娜，水神芙卡洛斯！',
    'prompt_lang': 'zh',
    'speed_factor': 1.0,
    'desc': '芙宁娜 - 戏剧腔调，水神'
},
```

### 2. 运行生成

```bash
pip install requests
python tools/generate_voice_gptsovits.py
```

脚本会自动：
- 提取 game-scene.html 中全部 57 条对话
- 逐条调用 API 生成 WAV 语音
- 生成 voice_index.json 索引
- 已存在文件自动跳过（断点续传）

### 3. 验证

打开 `game-scene.html`，进入游戏即可听到新配音。

---

## 八、进阶：微调训练自己的模型

如果零样本克隆效果不满意，用 1 分钟训练音频微调：

1. **启动 WebUI**：`go-webui.bat`（Windows）或 `python webui.py`
2. **训练标签页**：上传音频 → 自动切分 → ASR 标注 → 开始训练
3. **训练时间**：RTX 3060 约 15-20 分钟，RTX 4090 约 5-8 分钟
4. **模型输出**：`GPT_weights/你的模型名-e*.ckpt` + `SoVITS_weights/你的模型名-e*.pth`

---

## 九、效果对比

| 方案 | 音质 | 角色相似度 | 部署难度 | GPU |
|------|------|-----------|---------|-----|
| espeak-ng（当前） | ⭐⭐ | ⭐ | 极简 | 否 |
| GPT-SoVITS 零样本 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 中等 | 是 |
| GPT-SoVITS 微调 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 较高 | 是 |

---

## 十、常见问题

**Q: 整合包下载太慢？**
A: 用语雀文档的国内直链，或 B 站 UP 主「花儿不哭」的网盘链接。

**Q: 预训练模型下载失败？**
A: 使用 ModelScope（魔搭社区）或 hf-mirror 镜像站。

**Q: API 返回 400 错误？**
A: 检查参考音频路径是否正确，文件是否存在。

**Q: 显存不够（OOM）？**
A: 在 `tts_infer.yaml` 中减小 `batch_size`，或使用更低版本的模型。

**Q: 生成速度太慢？**
A: RTX 3060 约每条 3-5 秒，57 条总计约 3-10 分钟。

**Q: 不同角色声音太像？**
A: 每个角色训练独立模型，或使用差异更大的参考音频。
