#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
时空剧场 - 对话语音批量生成脚本
使用 espeak-ng 离线 TTS 引擎为每个角色生成不同风格的配音
"""

import re
import os
import json
import subprocess
import struct
import wave

# ============================================================
# 配置
# ============================================================

GAME_SCENE_PATH = '/workspace/game-scene.html'
OUTPUT_DIR = '/workspace/game/audio/voice'
INDEX_JSON_PATH = os.path.join(OUTPUT_DIR, 'voice_index.json')

# 角色声音配置
# espeak-ng 参数: -v (voice), -s (speed wpm), -p (pitch 0-99), -a (amplitude 0-200)
VOICE_CONFIG = {
    'fulina': {
        'voice': 'cmn',
        'speed': 155,      # 稍快，戏剧腔
        'pitch': 70,       # 较高音调，模拟少女声
        'amplitude': 180,
        'desc': '芙宁娜 - 戏剧腔调，略高音调'
    },
    'hutao': {
        'voice': 'cmn',
        'speed': 175,      # 快速活泼
        'pitch': 65,       # 中高音调
        'amplitude': 190,
        'desc': '胡桃 - 活泼快速，元气满满'
    },
    'louis': {
        'voice': 'cmn',
        'speed': 120,      # 缓慢庄重
        'pitch': 35,       # 低沉
        'amplitude': 170,
        'desc': '路易十六 - 缓慢低沉，庄重威严'
    },
    'robespierre': {
        'voice': 'cmn',
        'speed': 140,      # 中等偏慢
        'pitch': 40,       # 中低音调
        'amplitude': 185,
        'desc': '罗伯斯庇尔 - 坚定有力，中低音'
    },
    'napoleon': {
        'voice': 'cmn',
        'speed': 150,      # 果断有力
        'pitch': 38,       # 低沉果断
        'amplitude': 195,
        'desc': '拿破仑 - 果断有力，低沉威严'
    },
    'marie': {
        'voice': 'cmn',
        'speed': 140,      # 优雅从容
        'pitch': 60,       # 中高音调
        'amplitude': 175,
        'desc': '玛丽·安托瓦内特 - 优雅从容'
    },
    'narrator': {
        'voice': 'cmn',
        'speed': 130,      # 缓慢
        'pitch': 30,       # 最低沉
        'amplitude': 160,
        'desc': '旁白 - 低沉缓慢，叙事感'
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
# 对话提取
# ============================================================

def extract_dialog_from_html(html_path):
    """从 game-scene.html 中提取 DIALOG_SCRIPT 对话数据"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 提取 DIALOG_SCRIPT 数组内容
    match = re.search(r'const DIALOG_SCRIPT\s*=\s*\[(.*?)\];', content, re.DOTALL)
    if not match:
        print('[ERROR] 未找到 DIALOG_SCRIPT')
        return []

    script_content = match.group(1)
    dialog_lines = []
    dialog_index = 0

    # 用正则找出所有包含 speaker 和 text 的行（可能跨多行）
    # 先合并为单行
    merged = re.sub(r'\n\s*', ' ', script_content)

    # 匹配 { speaker: xxx, text: "yyy", ... } 模式
    pattern = r'\{\s*speaker:\s*"?(\w+|null)"?\s*,\s*text:\s*"([^"]+)"'
    for m in re.finditer(pattern, merged):
        speaker = m.group(1)
        text = m.group(2)

        if speaker == 'null':
            speaker_id = 'narrator'
        else:
            speaker_id = speaker

        dialog_lines.append({
            'index': dialog_index,
            'speaker': speaker_id,
            'text': text,
            'source': 'dialog'
        })
        dialog_index += 1

    return dialog_lines


def extract_ending_dialogs(html_path):
    """提取 afterlifeDialog 和 dramaticDialog"""
    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    result = {'afterlife': [], 'dramatic': []}
    key_map = {'afterlifeDialog': 'afterlife', 'dramaticDialog': 'dramatic'}

    for js_key, result_key in key_map.items():
        match = re.search(rf'const {js_key}\s*=\s*\[(.*?)\];', content, re.DOTALL)
        if not match:
            continue

        block = match.group(1)
        idx = 0
        merged = re.sub(r'\n\s*', ' ', block)

        pattern = r'\{\s*speaker:\s*"([^"]+)"\s*,\s*text:\s*"([^"]+)"'
        for m in re.finditer(pattern, merged):
            speaker_name = m.group(1)
            text = m.group(2)
            speaker_id = SPEAKER_NAME_MAP.get(speaker_name, 'narrator')

            result[result_key].append({
                'index': idx,
                'speaker': speaker_id,
                'text': text,
                'source': result_key
            })
            idx += 1

    return result


# ============================================================
# 语音生成
# ============================================================

def get_wav_duration(wav_path):
    """获取 WAV 文件时长（秒）"""
    try:
        with wave.open(wav_path, 'r') as wf:
            frames = wf.getnframes()
            rate = wf.getframerate()
            return frames / float(rate)
    except Exception:
        # 回退：基于文件大小估算
        file_size = os.path.getsize(wav_path)
        return file_size / 16000.0  # 16kHz mono 估算


def generate_one_voice(text, speaker_id, output_path):
    """使用 espeak-ng 生成单条语音"""
    config = VOICE_CONFIG.get(speaker_id, VOICE_CONFIG['narrator'])

    cmd = [
        'espeak-ng',
        '-v', config['voice'],
        '-s', str(config['speed']),
        '-p', str(config['pitch']),
        '-a', str(config['amplitude']),
        '-w', output_path,
        text
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f'[ERROR] espeak-ng 失败: {result.stderr}')
            return False

        if not os.path.exists(output_path) or os.path.getsize(output_path) < 100:
            print(f'[ERROR] 生成文件过小: {output_path}')
            return False

        return True
    except subprocess.TimeoutExpired:
        print(f'[ERROR] 生成超时: {output_path}')
        return False
    except Exception as e:
        print(f'[ERROR] 生成异常: {e}')
        return False


def generate_all_voices(dialog_lines, ending_dialogs):
    """批量生成所有语音"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_items = []
    voice_index = {'dialog': [], 'afterlife': [], 'dramatic': []}

    # 主对话
    for item in dialog_lines:
        filename = f"{item['speaker']}_{item['index']}.wav"
        filepath = os.path.join(OUTPUT_DIR, filename)
        item['file'] = f'game/audio/voice/{filename}'
        item['filepath'] = filepath
        all_items.append(item)

    # 结局对话
    for key in ['afterlife', 'dramatic']:
        for item in ending_dialogs.get(key, []):
            filename = f"{key}_{item['speaker']}_{item['index']}.wav"
            filepath = os.path.join(OUTPUT_DIR, filename)
            item['file'] = f'game/audio/voice/{filename}'
            item['filepath'] = filepath
            all_items.append(item)

    total = len(all_items)
    success = 0
    skip = 0
    fail = 0

    print(f'\n开始生成语音，共 {total} 条...\n')

    for i, item in enumerate(all_items):
        # 断点续传：已存在则跳过
        if os.path.exists(item['filepath']) and os.path.getsize(item['filepath']) > 100:
            duration = get_wav_duration(item['filepath'])
            entry = {
                'index': item['index'],
                'speaker': item['speaker'],
                'text': item['text'],
                'file': item['file'],
                'duration': round(duration, 2)
            }
            voice_index[item['source']].append(entry)
            skip += 1
            print(f'[{i+1}/{total}] 跳过(已存在): {item["speaker"]}_{item["index"]}')
            continue

        # 生成语音
        ok = generate_one_voice(item['text'], item['speaker'], item['filepath'])

        if ok:
            duration = get_wav_duration(item['filepath'])
            entry = {
                'index': item['index'],
                'speaker': item['speaker'],
                'text': item['text'],
                'file': item['file'],
                'duration': round(duration, 2)
            }
            voice_index[item['source']].append(entry)
            success += 1
            print(f'[{i+1}/{total}] ✓ {item["speaker"]}_{item["index"]} ({duration:.1f}s) - {item["text"][:30]}...')
        else:
            fail += 1
            print(f'[{i+1}/{total}] ✗ 失败: {item["speaker"]}_{item["index"]}')

    # 保存索引
    with open(INDEX_JSON_PATH, 'w', encoding='utf-8') as f:
        json.dump(voice_index, f, ensure_ascii=False, indent=2)

    print(f'\n===== 生成完成 =====')
    print(f'总计: {total} 条')
    print(f'成功: {success} 条')
    print(f'跳过: {skip} 条（已存在）')
    print(f'失败: {fail} 条')
    print(f'索引文件: {INDEX_JSON_PATH}')

    return voice_index


# ============================================================
# 主函数
# ============================================================

def main():
    print('=' * 60)
    print('时空剧场 - 对话语音批量生成')
    print('=' * 60)

    # 打印角色配置
    print('\n角色声音配置:')
    for name, cfg in VOICE_CONFIG.items():
        print(f'  {name}: speed={cfg["speed"]}, pitch={cfg["pitch"]}, amp={cfg["amplitude"]} - {cfg["desc"]}')

    # 提取对话
    print(f'\n提取对话文本: {GAME_SCENE_PATH}')
    dialog_lines = extract_dialog_from_html(GAME_SCENE_PATH)
    print(f'  主对话: {len(dialog_lines)} 条')

    ending_dialogs = extract_ending_dialogs(GAME_SCENE_PATH)
    print(f'  来世结局: {len(ending_dialogs["afterlife"])} 条')
    print(f'  戏剧结局: {len(ending_dialogs["dramatic"])} 条')

    total = len(dialog_lines) + len(ending_dialogs['afterlife']) + len(ending_dialogs['dramatic'])
    print(f'  总计: {total} 条')

    if total == 0:
        print('[ERROR] 未提取到任何对话！')
        return

    # 生成语音
    voice_index = generate_all_voices(dialog_lines, ending_dialogs)

    # 验证
    print(f'\n===== 验证 =====')
    for source in ['dialog', 'afterlife', 'dramatic']:
        items = voice_index.get(source, [])
        print(f'  {source}: {len(items)} 条语音')
        for item in items[:3]:
            print(f'    - {item["speaker"]}_{item["index"]}: {item["duration"]}s - {item["text"][:20]}...')
        if len(items) > 3:
            print(f'    ... 还有 {len(items)-3} 条')


if __name__ == '__main__':
    main()
