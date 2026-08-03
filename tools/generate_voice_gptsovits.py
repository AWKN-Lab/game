#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
时空剧场 - GPT-SoVITS 语音批量生成脚本
==========================================

使用方法:
  1. 先启动 GPT-SoVITS API 服务:
     cd GPT-SoVITS  &&  python api_v2.py -a 127.0.0.1 -p 9880

  2. 运行本脚本:
     python tools/generate_voice_gptsovits.py

  3. 生成的语音会自动替换 game/audio/voice/ 下的文件

依赖: pip install requests
无需 GPU（GPU 在 GPT-SoVITS 服务端）
"""

import os
import sys
import json
import re
import time
import struct
import wave
import requests

# ============================================================
# 配置区 —— 根据你的实际情况修改
# ============================================================

# GPT-SoVITS API 地址
API_URL = "http://127.0.0.1:9880"

# 项目路径
GAME_SCENE_PATH = os.path.join(os.path.dirname(__file__), '..', 'game-scene.html')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'game', 'audio', 'voice')
INDEX_JSON_PATH = os.path.join(OUTPUT_DIR, 'voice_index.json')

# ============================================================
# 角色声音配置
# 每个角色需要: 参考音频路径 + 参考文本 + 语言
#
# 【重要】你需要自行准备以下参考音频文件（每个5-15秒即可）:
#   - 放在 GPT-SoVITS 项目目录下，或任意 GPT-SoVITS 可访问的路径
#   - 芙宁娜: 找一段芙宁娜的中文语音（游戏内录音或官方PV）
#   - 胡桃:   找一段胡桃的中文语音
#   - NPC:    可以用任意男声/女声作为参考
#
# 如果你有社区预训练的 .ckpt + .pth 模型文件，
# 可以通过 /set_gpt_weights 和 /set_sovits_weights 接口加载，
# 这样就不需要参考音频了（直接用模型推理）。
# ============================================================

VOICE_CONFIG = {
    'fulina': {
        # 方案A: 零样本克隆（用参考音频）
        'ref_audio_path': 'GPT_SoVITS/references/fulina_ref.wav',
        'prompt_text': '我是芙宁娜，水神芙卡洛斯！',
        'prompt_lang': 'zh',
        'speed_factor': 1.0,
        'temperature': 1.0,
        'top_k': 10,
        'top_p': 0.9,
        # 方案B: 如果有预训练模型，取消下面的注释
        # 'gpt_weights': 'GPT_SoVITS/trained_models/fulina/e10_s2000.ckpt',
        # 'sovits_weights': 'GPT_SoVITS/trained_models/fulina/e10_s2000.pth',
        'desc': '芙宁娜 - 戏剧腔调，水神'
    },
    'hutao': {
        'ref_audio_path': 'GPT_SoVITS/references/hutao_ref.wav',
        'prompt_text': '我是往生堂第七十七代堂主胡桃！',
        'prompt_lang': 'zh',
        'speed_factor': 1.1,      # 稍快，活泼
        'temperature': 1.0,
        'top_k': 10,
        'top_p': 0.9,
        'desc': '胡桃 - 活泼快速，元气满满'
    },
    'louis': {
        'ref_audio_path': 'GPT_SoVITS/references/louis_ref.wav',
        'prompt_text': '各位代表，国家财政已经破产了。',
        'prompt_lang': 'zh',
        'speed_factor': 0.9,      # 稍慢，庄重
        'temperature': 0.8,
        'top_k': 8,
        'top_p': 0.85,
        'desc': '路易十六 - 庄重威严'
    },
    'robespierre': {
        'ref_audio_path': 'GPT_SoVITS/references/robespierre_ref.wav',
        'prompt_text': '现在，我们要制定一部伟大的宣言。',
        'prompt_lang': 'zh',
        'speed_factor': 0.95,
        'temperature': 0.8,
        'top_k': 8,
        'top_p': 0.85,
        'desc': '罗伯斯庇尔 - 坚定有力'
    },
    'napoleon': {
        'ref_audio_path': 'GPT_SoVITS/references/napoleon_ref.wav',
        'prompt_text': '我是拿破仑·波拿巴！',
        'prompt_lang': 'zh',
        'speed_factor': 1.0,
        'temperature': 0.8,
        'top_k': 8,
        'top_p': 0.85,
        'desc': '拿破仑 - 果断威严'
    },
    'marie': {
        'ref_audio_path': 'GPT_SoVITS/references/marie_ref.wav',
        'prompt_text': '如果我能重来，我会选择站在人民的一边。',
        'prompt_lang': 'zh',
        'speed_factor': 0.95,
        'temperature': 1.0,
        'top_k': 10,
        'top_p': 0.9,
        'desc': '玛丽·安托瓦内特 - 优雅从容'
    },
    'narrator': {
        'ref_audio_path': 'GPT_SoVITS/references/narrator_ref.wav',
        'prompt_text': '灯光亮起，帷幕拉开。',
        'prompt_lang': 'zh',
        'speed_factor': 0.85,     # 最慢，叙事感
        'temperature': 0.7,
        'top_k': 5,
        'top_p': 0.8,
        'desc': '旁白 - 低沉缓慢'
    }
}

# 中文名 -> 英文ID 映射
SPEAKER_NAME_MAP = {
    '旁白': 'narrator',
    '芙宁娜': 'fulina',
    '胡桃': 'hutao',
    '路易十六': 'louis',
    '罗伯斯庇尔': 'robespierre',
    '拿破仑': 'napoleon',
    '玛丽·安托瓦内特': 'marie'
}


# ============================================================
# 对话提取（与 generate_voice.py 共用逻辑）
# ============================================================

def extract_dialog_from_html(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    match = re.search(r'const DIALOG_SCRIPT\s*=\s*\[(.*?)\];', content, re.DOTALL)
    if not match:
        return []
    merged = re.sub(r'\n\s*', ' ', match.group(1))
    pattern = r'\{\s*speaker:\s*"?(\w+|null)"?\s*,\s*text:\s*"([^"]+)"'
    lines = []
    idx = 0
    for m in re.finditer(pattern, merged):
        speaker = 'narrator' if m.group(1) == 'null' else m.group(1)
        lines.append({'index': idx, 'speaker': speaker, 'text': m.group(2), 'source': 'dialog'})
        idx += 1
    return lines


def extract_ending_dialogs(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()
    result = {'afterlife': [], 'dramatic': []}
    key_map = {'afterlifeDialog': 'afterlife', 'dramaticDialog': 'dramatic'}
    for js_key, result_key in key_map.items():
        match = re.search(rf'const {js_key}\s*=\s*\[(.*?)\];', content, re.DOTALL)
        if not match:
            continue
        merged = re.sub(r'\n\s*', ' ', match.group(1))
        pattern = r'\{\s*speaker:\s*"([^"]+)"\s*,\s*text:\s*"([^"]+)"'
        idx = 0
        for m in re.finditer(pattern, merged):
            speaker_id = SPEAKER_NAME_MAP.get(m.group(1), 'narrator')
            result[result_key].append({'index': idx, 'speaker': speaker_id, 'text': m.group(2), 'source': result_key})
            idx += 1
    return result


# ============================================================
# GPT-SoVITS API 调用
# ============================================================

def check_api():
    """检查 GPT-SoVITS API 是否可用"""
    try:
        resp = requests.get(f"{API_URL}/", timeout=5)
        return True
    except Exception:
        return False


def set_model(speaker_id, config):
    """切换到指定角色的模型（如果有预训练模型）"""
    gpt_weights = config.get('gpt_weights')
    sovits_weights = config.get('sovits_weights')
    if not gpt_weights or not sovits_weights:
        return True

    try:
        # 切换 GPT 模型
        resp = requests.get(f"{API_URL}/set_gpt_weights", params={'weights_path': gpt_weights}, timeout=10)
        if resp.status_code != 200:
            print(f"  [WARN] 切换GPT模型失败: {resp.text}")
            return False

        # 切换 SoVITS 模型
        resp = requests.get(f"{API_URL}/set_sovits_weights", params={'weights_path': sovits_weights}, timeout=10)
        if resp.status_code != 200:
            print(f"  [WARN] 切换SoVITS模型失败: {resp.text}")
            return False

        print(f"  已切换到预训练模型: {speaker_id}")
        time.sleep(1)  # 等待模型加载
        return True
    except Exception as e:
        print(f"  [WARN] 模型切换异常: {e}")
        return False


def generate_one_voice(text, speaker_id, output_path, config):
    """调用 GPT-SoVITS API 生成单条语音"""
    payload = {
        "text": text,
        "text_lang": "zh",
        "ref_audio_path": config['ref_audio_path'],
        "prompt_text": config.get('prompt_text', ''),
        "prompt_lang": config.get('prompt_lang', 'zh'),
        "top_k": config.get('top_k', 10),
        "top_p": config.get('top_p', 0.9),
        "temperature": config.get('temperature', 1.0),
        "text_split_method": "cut5",
        "speed_factor": config.get('speed_factor', 1.0),
        "batch_size": 1,
        "media_type": "wav",
        "streaming_mode": False,
        "parallel_infer": True,
        "repetition_penalty": 1.35,
    }

    max_retries = 3
    for attempt in range(1, max_retries + 1):
        try:
            resp = requests.post(
                f"{API_URL}/tts",
                json=payload,
                timeout=120  # 长文本可能需要较长时间
            )

            if resp.status_code == 200:
                # 保存 WAV 文件
                with open(output_path, 'wb') as f:
                    f.write(resp.content)
                return True
            else:
                error_msg = resp.json() if resp.headers.get('content-type', '').startswith('application/json') else resp.text
                print(f"  [重试 {attempt}/{max_retries}] API 错误 {resp.status_code}: {error_msg}")
        except requests.exceptions.Timeout:
            print(f"  [重试 {attempt}/{max_retries}] 请求超时")
        except Exception as e:
            print(f"  [重试 {attempt}/{max_retries}] 异常: {e}")

        if attempt < max_retries:
            time.sleep(3 * attempt)  # 指数退避

    return False


def get_wav_duration(wav_path):
    """获取 WAV 文件时长"""
    try:
        with wave.open(wav_path, 'r') as wf:
            return wf.getnframes() / float(wf.getframerate())
    except Exception:
        return os.path.getsize(wav_path) / 32000.0


# ============================================================
# 批量生成
# ============================================================

def generate_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # 提取对话
    game_scene = os.path.normpath(GAME_SCENE_PATH)
    dialog_lines = extract_dialog_from_html(game_scene)
    ending_dialogs = extract_ending_dialogs(game_scene)

    all_items = []
    for item in dialog_lines:
        filename = f"{item['speaker']}_{item['index']}.wav"
        item['filepath'] = os.path.join(OUTPUT_DIR, filename)
        item['file'] = f'game/audio/voice/{filename}'
        all_items.append(item)

    for key in ['afterlife', 'dramatic']:
        for item in ending_dialogs.get(key, []):
            filename = f"{key}_{item['speaker']}_{item['index']}.wav"
            item['filepath'] = os.path.join(OUTPUT_DIR, filename)
            item['file'] = f'game/audio/voice/{filename}'
            all_items.append(item)

    total = len(all_items)
    success = 0
    skip = 0
    fail = 0

    print(f'\n共 {total} 条对话待生成')
    print(f'API 地址: {API_URL}\n')

    # 按角色分组，减少模型切换次数
    current_model = None

    for i, item in enumerate(all_items):
        speaker = item['speaker']
        config = VOICE_CONFIG.get(speaker, VOICE_CONFIG['narrator'])

        # 断点续传
        if os.path.exists(item['filepath']) and os.path.getsize(item['filepath']) > 1000:
            skip += 1
            print(f'[{i+1}/{total}] 跳过(已存在): {speaker}_{item["index"]}')
            continue

        # 切换模型（如果配置了预训练模型）
        if config.get('gpt_weights') and config.get('gpt_weights') != current_model:
            set_model(speaker, config)
            current_model = config.get('gpt_weights')

        # 生成
        print(f'[{i+1}/{total}] 生成: {speaker}_{item["index"]} - {item["text"][:30]}...', end=' ')
        ok = generate_one_voice(item['text'], speaker, item['filepath'], config)

        if ok:
            duration = get_wav_duration(item['filepath'])
            print(f'✓ ({duration:.1f}s)')
            success += 1
        else:
            print('✗ 失败')
            fail += 1

    # 生成索引
    voice_index = {'dialog': [], 'afterlife': [], 'dramatic': []}
    for item in all_items:
        if os.path.exists(item['filepath']) and os.path.getsize(item['filepath']) > 1000:
            duration = get_wav_duration(item['filepath'])
            voice_index[item['source']].append({
                'index': item['index'],
                'speaker': item['speaker'],
                'text': item['text'],
                'file': item['file'],
                'duration': round(duration, 2)
            })

    with open(INDEX_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(voice_index, f, ensure_ascii=False, indent=2)

    print(f'\n===== 完成 =====')
    print(f'总计: {total} | 成功: {success} | 跳过: {skip} | 失败: {fail}')
    print(f'索引: {INDEX_JSON_PATH}')


# ============================================================
# 主函数
# ============================================================

def main():
    print('=' * 60)
    print('时空剧场 - GPT-SoVITS 语音批量生成')
    print('=' * 60)

    # 检查 API
    print(f'\n检查 GPT-SoVITS API: {API_URL}')
    if not check_api():
        print(f'\n[ERROR] GPT-SoVITS API 不可用！')
        print(f'请先启动 API 服务:')
        print(f'  cd GPT-SoVITS')
        print(f'  python api_v2.py -a 127.0.0.1 -p 9880')
        print(f'\n如果端口不是 9880，请修改本脚本顶部的 API_URL')
        sys.exit(1)
    print('API 连接成功 ✓')

    # 打印角色配置
    print('\n角色配置:')
    for name, cfg in VOICE_CONFIG.items():
        has_model = '✓ 预训练模型' if cfg.get('gpt_weights') else f'参考音频: {cfg["ref_audio_path"]}'
        print(f'  {name}: speed={cfg["speed_factor"]}, temp={cfg["temperature"]} | {has_model}')

    generate_all()


if __name__ == '__main__':
    main()
