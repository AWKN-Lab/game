#!/usr/bin/env python3
"""
generate-sfx.py — 合成自有音效（原创资产，权属清晰，不依赖任何第三方授权）

用途：替换 audio-manager.js 里"复用同一音效"的占位做法（枪声=弓箭、欢呼=点击、
海浪=雨声、钟声=切换音）。BGM（music/*.mp3）不在本脚本范围内。

依赖：numpy（仅生成期需要，运行期不依赖）。产物：44.1kHz 单声道 16bit WAV。

用法：
    python3 scripts/generate-sfx.py            # 写入 audio/sfx/
    python3 scripts/generate-sfx.py --preview  # 只打印计划，不写文件
"""
import argparse
import os
import struct
import wave

import numpy as np

SR = 44100
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'audio', 'sfx')


def _t(duration):
    return np.linspace(0, duration, int(SR * duration), endpoint=False)


def _noise(n):
    return np.random.default_rng(20261128).standard_normal(n)


def _env(n, attack=0.005, decay=None, curve=2.0):
    env = np.ones(n)
    a = max(1, int(SR * attack))
    env[:a] = np.linspace(0, 1, a)
    if decay:
        d = min(n, int(SR * decay))
        env[-d:] = np.linspace(1, 0, d) ** curve
    return env


def _lowpass(x, cutoff):
    # 单极点低通，够用即可
    alpha = 1 - np.exp(-2 * np.pi * cutoff / SR)
    out = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += alpha * (v - acc)
        out[i] = acc
    return out


def _highpass(x, cutoff):
    return x - _lowpass(x, cutoff)


def _bandpass(x, low, high):
    return _lowpass(_highpass(x, low), high)


def gunshot():
    """枪声：高频爆裂 + 低频冲击 + 远处回声尾"""
    dur = 0.55
    n = len(_t(dur))
    body = _noise(n)
    crack = _highpass(body, 2200) * _env(n, 0.001, 0.09, 2.4)
    thump = np.sin(2 * np.pi * 90 * _t(dur)) * _env(n, 0.002, 0.30, 2.0)
    tail = _lowpass(_noise(n), 900) * _env(n, 0.05, 0.45, 1.4)
    return 0.55 * crack + 0.45 * thump + 0.22 * tail


def distant_gunfire():
    """远处枪声：低通 + 混响尾 + 更低音量"""
    dur = 1.1
    n = len(_t(dur))
    body = _lowpass(_noise(n), 1400)
    crack = _highpass(body, 900) * _env(n, 0.004, 0.18, 2.0)
    thump = np.sin(2 * np.pi * 62 * _t(dur)) * _env(n, 0.006, 0.45, 1.6)
    tail = _lowpass(_noise(n), 600) * _env(n, 0.08, 0.9, 1.2)
    return 0.35 * crack + 0.45 * thump + 0.5 * tail


def crowd_cheer():
    """人群欢呼：更宽的频带、更强的起伏"""
    dur = 2.0
    n = len(_t(dur))
    voices = _bandpass(_noise(n), 350, 5200)
    swell = (0.5 + 0.5 * np.sin(2 * np.pi * 2.3 * _t(dur) - 0.8)) ** 1.3
    shape = np.concatenate([np.linspace(0, 1, int(SR * 0.1)), np.ones(n - int(SR * 0.1))]) * _env(n, 0.015, 0.6, 1.1)
    return voices * swell * shape


def cheering():
    """欢呼：宽带噪声群 + 起伏包络，模拟人群"""
    dur = 1.6
    n = len(_t(dur))
    voices = _bandpass(_noise(n), 500, 3200)
    swell = (np.sin(2 * np.pi * 1.7 * _t(dur)) * 0.5 + 0.5) ** 1.6
    shape = np.concatenate([np.linspace(0, 1, int(SR * 0.12)), np.ones(n - int(SR * 0.12))]) * _env(n, 0.02, 0.5, 1.2)
    return voices * swell * shape * 0.9


def ocean_waves():
    """海浪：慢速调制的滤波噪声"""
    dur = 3.0
    n = len(_t(dur))
    base = _lowpass(_noise(n), 1400)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.28 * _t(dur) - np.pi / 2)
    return base * (0.25 + 0.75 * lfo ** 2) * _env(n, 0.25, 0.8, 1.1)


def crowd_murmur():
    """人群低语：低频带噪声 + 缓慢漂移"""
    dur = 3.0
    n = len(_t(dur))
    base = _bandpass(_noise(n), 160, 900)
    drift = 0.7 + 0.3 * np.sin(2 * np.pi * 0.17 * _t(dur))
    return base * drift * 0.85


def bell_toll():
    """钟声：非谐分音衰减"""
    dur = 2.6
    t = _t(dur)
    partials = [(196, 1.0), (392, 0.55), (587, 0.32), (784, 0.18), (1170, 0.09)]
    out = np.zeros_like(t)
    for freq, amp in partials:
        out += amp * np.sin(2 * np.pi * freq * t) * np.exp(-t * (0.9 + freq / 1400))
    return out * _env(len(out), 0.002, 0.2, 1.0)


def fireworks():
    """烟花：升空 + 爆裂 + 碎响"""
    dur = 1.8
    n = len(_t(dur))
    rise = np.sin(2 * np.pi * (300 + 900 * _t(dur)[:1].repeat(n)) * _t(dur)) * _env(n, 0.0, 0.0)
    burst = _highpass(_noise(n), 1800) * _env(n, 0.30, 0.7, 1.6)
    crackle = _noise(n) * 0.25 * (_env(n, 0.35, 1.0, 1.2))
    return 0.30 * rise + 0.60 * burst + 0.25 * crackle


def pen_scratch():
    """笔触：稀疏颗粒噪声"""
    dur = 0.9
    n = len(_t(dur))
    grains = _highpass(_noise(n), 2600)
    mask = np.zeros(n)
    for start in np.random.default_rng(7).uniform(0, dur - 0.08, 12):
        i = int(start * SR)
        mask[i:i + int(0.05 * SR)] = 1.0
    return grains * mask * 0.8


def marching_boots():
    """行军：规律脚步低频"""
    dur = 2.0
    n = len(_t(dur))
    out = np.zeros(n)
    for k in range(8):
        i = int(k * 0.25 * SR)
        seg = int(0.12 * SR)
        if i + seg > n:
            break
        step = np.sin(2 * np.pi * 70 * _t(0.12)) * _env(seg, 0.002, 0.09, 2.2)
        noise = _lowpass(_noise(seg), 600) * _env(seg, 0.001, 0.05, 2.0)
        out[i:i + seg] += 0.6 * step + 0.4 * noise
    return out


def wind_cold():
    """冷风：带通噪声 + 缓慢起伏"""
    dur = 3.0
    n = len(_t(dur))
    base = _bandpass(_noise(n), 300, 2200)
    lfo = 0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * _t(dur) + 1.1)
    return base * (0.2 + 0.8 * lfo) * 0.8


def palace_ambient():
    """宫殿氛围：低频底噪 + 缓慢和声"""
    dur = 3.0
    t = _t(dur)
    drone = 0.5 * np.sin(2 * np.pi * 98 * t) + 0.3 * np.sin(2 * np.pi * 147 * t) * 0.8
    shimmer = 0.12 * _bandpass(_noise(len(t)), 1800, 5200) * (0.4 + 0.6 * np.sin(2 * np.pi * 0.07 * t))
    return drone * 0.5 + shimmer


def dawn_birds():
    """晨鸟：频率滑移的短啁啾"""
    dur = 2.2
    t = _t(dur)
    out = np.zeros_like(t)
    rng = np.random.default_rng(11)
    for _ in range(7):
        start = rng.uniform(0, dur - 0.35)
        length = rng.uniform(0.12, 0.3)
        i = int(start * SR)
        seg = int(length * SR)
        if i + seg > len(t):
            break
        f0 = rng.uniform(2200, 3600)
        f1 = f0 * rng.uniform(0.6, 1.5)
        seg_t = _t(length)
        chirp = np.sin(2 * np.pi * (f0 * seg_t + (f1 - f0) / (2 * length) * seg_t ** 2))
        out[i:i + seg] += chirp * _env(seg, 0.01, length * 0.7, 1.6) * 0.5
    return out


def paper_scroll():
    """纸张：短促脆响"""
    dur = 0.6
    n = len(_t(dur))
    base = _highpass(_noise(n), 2400)
    mask = np.zeros(n)
    for start in np.random.default_rng(3).uniform(0, dur - 0.1, 6):
        i = int(start * SR)
        mask[i:i + int(0.07 * SR)] = 1.0
    return base * mask * 0.75


def sword_clash():
    """兵器相击：金属非谐分音 + 噪声瞬态"""
    dur = 1.0
    t = _t(dur)
    out = np.zeros_like(t)
    for freq, amp in [(1240, 0.6), (1867, 0.4), (2790, 0.25), (4130, 0.12)]:
        out += amp * np.sin(2 * np.pi * freq * t) * np.exp(-t * 6.5)
    transient = _highpass(_noise(len(t)), 3000) * _env(len(t), 0.001, 0.06, 2.5)
    return out * 0.7 + transient * 0.5


def rain(heavy=False):
    """雨声：带通噪声，heavy 版更宽更响"""
    dur = 3.0
    n = len(_t(dur))
    base = _bandpass(_noise(n), 400 if heavy else 700, 7000 if heavy else 5200)
    lfo = 0.65 + 0.35 * np.sin(2 * np.pi * 0.23 * _t(dur))
    drops = _highpass(_noise(n), 5200) * (np.random.default_rng(5).random(n) > 0.999) * 0.6
    return (base * lfo * (1.0 if heavy else 0.7)) + drops * (1.0 if heavy else 0.4)


def value_blip(up=True):
    """数值变化：上行明亮 / 下行沉闷"""
    dur = 0.16
    t = _t(dur)
    f0, f1 = (720, 1040) if up else (560, 330)
    tone = np.sin(2 * np.pi * (f0 * t + (f1 - f0) / (2 * dur) * t ** 2))
    return tone * _env(len(t), 0.004, 0.1, 1.6) * 0.8



PLAN = {
    'gunfire.wav': gunshot,
    'gunfire_distant.wav': lambda: distant_gunfire(),
    'cheering.wav': cheering,
    'crowd_cheer.wav': lambda: crowd_cheer(),
    'ocean_waves.wav': ocean_waves,
    'crowd_murmur.wav': crowd_murmur,
    'bell_toll.wav': bell_toll,
    'fireworks.wav': fireworks,
    'pen_scratch.wav': pen_scratch,
    'marching_boots.wav': marching_boots,
    'wind_cold.wav': wind_cold,
    'palace_ambient.wav': palace_ambient,
    'dawn_birds.wav': dawn_birds,
    'paper_scroll.wav': paper_scroll,
    'sword_clash.wav': sword_clash,
    'rain.wav': lambda: rain(False),
    'rain_heavy.wav': lambda: rain(True),
    'value_up.wav': lambda: value_blip(True),
    'value_down.wav': lambda: value_blip(False),
}


def write_wav(name, samples):
    peak = float(np.max(np.abs(samples))) or 1.0
    data = (samples / peak * 0.85 * 32767).astype('<i2')
    path = os.path.join(OUT_DIR, name)
    with wave.open(path, 'wb') as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(SR)
        fh.writeframes(data.tobytes())
    return path, len(data) * 2


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true')
    args = parser.parse_args()
    os.makedirs(OUT_DIR, exist_ok=True)
    total = 0
    for name, fn in PLAN.items():
        samples = fn()
        if args.preview:
            print(f'{name}: {len(samples) / SR:.2f}s')
            continue
        path, size = write_wav(name, samples)
        total += size
        print(f'{name}: {len(samples) / SR:.2f}s  {size / 1024:.0f}KB')
    if not args.preview:
        print(f'合计 {total / 1024:.0f}KB')


if __name__ == '__main__':
    main()
