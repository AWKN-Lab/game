// ============================================================
// AudioManager - 音频管理器（真实音频实现）
// ============================================================
(function() {
    'use strict';

    var _bgmAudio = null;
    var _ambientAudio = null;
    var _bgmVolume = 0.5;
    var _sfxVolume = 0.7;
    var _muted = false;
    var _audioEnabled = false;

    // 尝试初始化 AudioContext（移动端需要用户交互后才能播放）
    function _ensureAudioContext() {
        if (_audioEnabled) return true;
        try {
            var ctx = new (window.AudioContext || window.webkitAudioContext)();
            if (ctx.state === 'suspended') {
                ctx.resume();
            }
            _audioEnabled = true;
            return true;
        } catch(e) {
            console.warn('[Audio] Web Audio API not available:', e);
            return false;
        }
    }

    // 获取音频基础路径（相对路径）
    function _getBasePath() {
        return '';
    }

    window.AudioManager = {
        bgmVolume: 0.5,
        sfxVolume: 0.7,
        _bgm: null,

        // 播放背景音乐（循环）
        playBGM: function(src) {
            try {
                // 停止当前BGM
                this.stopBGM();

                var audio = new Audio(src);
                audio.loop = true;
                audio.volume = _bgmVolume;
                audio.preload = 'auto';

                // 淡入效果
                audio.volume = 0;
                var fadeIn = setInterval(function() {
                    if (audio.volume < _bgmVolume - 0.01) {
                        audio.volume += 0.02;
                    } else {
                        audio.volume = _bgmVolume;
                        clearInterval(fadeIn);
                    }
                }, 100);

                var playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(function(err) {
                        console.warn('[Audio] BGM play failed:', err);
                    });
                }

                _bgmAudio = audio;
                this._bgm = audio;
                console.log('[Audio] Playing BGM:', src);
            } catch(e) {
                console.warn('[Audio] BGM error:', e);
            }
        },

        // 停止背景音乐（淡出）
        stopBGM: function() {
            if (_bgmAudio) {
                try {
                    var audio = _bgmAudio;
                    var fadeOut = setInterval(function() {
                        if (audio.volume > 0.02) {
                            audio.volume -= 0.02;
                        } else {
                            audio.pause();
                            audio.currentTime = 0;
                            audio.src = '';
                            clearInterval(fadeOut);
                        }
                    }, 50);
                } catch(e) {
                    // 忽略
                }
                _bgmAudio = null;
                this._bgm = null;
            }
        },

        // 播放环境音效（循环，低音量）
        playAmbient: function(src) {
            try {
                this.stopAmbient();
                var audio = new Audio(src);
                audio.loop = true;
                audio.volume = 0.25;  // 环境音效较低音量
                audio.play().catch(function(){});
                _ambientAudio = audio;
                console.log('[Audio] Playing ambient:', src);
            } catch(e) {
                console.warn('[Audio] Ambient error:', e);
            }
        },

        // 停止环境音效
        stopAmbient: function() {
            if (_ambientAudio) {
                try {
                    _ambientAudio.pause();
                    _ambientAudio.currentTime = 0;
                    _ambientAudio.src = '';
                } catch(e) {}
                _ambientAudio = null;
            }
        },

        // 播放音效（单次）
        playSFX: function(src) {
            try {
                var audio = new Audio(src);
                audio.volume = _sfxVolume;
                audio.preload = 'auto';
                var playPromise = audio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(function(err) {
                        console.warn('[Audio] SFX play failed:', err);
                    });
                }
                console.log('[Audio] Playing SFX:', src);
            } catch(e) {
                console.warn('[Audio] SFX error:', e);
            }
        },

        // 设置BGM音量
        setBGMVolume: function(v) {
            _bgmVolume = Math.max(0, Math.min(1, v));
            this.bgmVolume = _bgmVolume;
            if (_bgmAudio) {
                _bgmAudio.volume = _bgmVolume;
            }
        },

        // 设置SFX音量
        setSFXVolume: function(v) {
            _sfxVolume = Math.max(0, Math.min(1, v));
            this.sfxVolume = _sfxVolume;
        },

        // 静音切换
        toggleMute: function() {
            _muted = !_muted;
            if (_bgmAudio) {
                _bgmAudio.muted = _muted;
            }
            return _muted;
        },

        // 是否静音
        isMuted: function() {
            return _muted;
        },

        // 预定义音频路径常量（新版MP3 BGM）
        BGM: {
            // ===== 工业革命场景 BGM =====
            THEATER: 'music/industrial_revolution/01_factory_v2.mp3',        // 时空剧场 - 开场氛围
            PASTORAL: 'music/industrial_revolution/01_factory.mp3',           // 珍妮机的诞生 - 田园早期
            INDUSTRIAL_STEAM: 'music/industrial_revolution/02_progress.mp3',  // 蒸汽机的怒吼 - 进步
            DARK_FACTORY: 'music/industrial_revolution/01_factory.mp3',       // 工厂的阴影 - 工厂低沉
            TRAIN_ADVENTURE: 'music/industrial_revolution/02_progress.mp3',   // 火车的轰鸣 - 激昂前进
            SOLEMN: 'music/industrial_revolution/03_reflection.mp3',          // 工业革命的代价 - 反思
            // ===== 美国独立战争场景 BGM =====
            AMERICAN_THEATER: 'music/american_revolution/01_freedom.mp3',       // 时空剧场 - 自由前奏
            AMERICAN_COLONIAL: 'music/american_revolution/01_freedom.mp3',      // 殖民压迫 - 自由抗争
            AMERICAN_BATTLE: 'music/american_revolution/02_declaration.mp3',    // 独立战争 - 宣言战斗
            AMERICAN_DECLARATION: 'music/american_revolution/02_declaration.mp3',// 独立宣言 - 宣言
            AMERICAN_VICTORY: 'music/american_revolution/03_victory.mp3',       // 胜利与建国 - 胜利
            AMERICAN_CONSTITUTION: 'music/american_revolution/03_victory.mp3',  // 共和国的建立 - 胜利
            AMERICAN_LEGACY: 'music/american_revolution/03_victory.mp3',        // 自由的遗产 - 庄严
            // ===== 法国大革命场景 BGM =====
            FRENCH_REVOLUTION: 'music/french_revolution/01_opening_v2.mp3',  // 总开场
            VERSAILLES: 'music/french_revolution/01_opening.mp3',            // 凡尔赛宫 - 开场
            BASTILLE: 'music/french_revolution/02_revolution.mp3',           // 巴士底狱 - 革命
            ASSEMBLY: 'music/french_revolution/02_revolution.mp3',           // 国民议会 - 革命
            TERROR: 'music/french_revolution/03_tragic.mp3',                 // 恐怖统治 - 悲剧
            NAPOLEON: 'music/french_revolution/03_tragic.mp3',               // 拿破仑 - 悲壮
            // ===== 辛亥革命场景 BGM =====
            XINHAI_THEATER: 'music/xinhai_revolution/01_uprising_v2.mp3',       // 时空剧场 - 开场
            XINHAI_OVERSEAS: 'music/xinhai_revolution/01_uprising.mp3',         // 海外革命 - 起义前奏
            XINHAI_WUCHANG: 'music/xinhai_revolution/02_republic.mp3',          // 武昌起义 - 共和
            XINHAI_REPUBLIC: 'music/xinhai_revolution/02_republic.mp3',         // 共和曙光 - 共和
            XINHAI_SOLEMN: 'music/xinhai_revolution/03_memorial.mp3',           // 革命代价 - 纪念
            XINHAI_BEIJING_SOMBER: 'music/xinhai_revolution/03_memorial.mp3',   // 北京沉郁（复用memorial）
            XINHAI_HONOLULU_HOPE: 'music/xinhai_revolution/01_uprising.mp3',   // 檀香山希望（复用uprising）
            XINHAI_TOKYO_RISING: 'music/xinhai_revolution/01_uprising.mp3',    // 东京崛起（复用uprising）
            XINHAI_WUCHANG_BATTLE: 'music/xinhai_revolution/02_republic.mp3',  // 武昌战斗（复用republic）
            XINHAI_NANJING_TRIUMPH: 'music/xinhai_revolution/02_republic.mp3', // 南京胜利（复用republic）
            XINHAI_FORBIDDEN_FALL: 'music/xinhai_revolution/03_memorial.mp3',  // 紫禁城陷落（复用memorial）
            XINHAI_PROVISIONAL_HOPE: 'music/xinhai_revolution/02_republic.mp3',// 临时政府希望（复用republic）
            XINHAI_BEIJING_DARK: 'music/xinhai_revolution/03_memorial.mp3',    // 北京黑暗（复用memorial）
            XINHAI_NANJING_BRIGHT: 'music/xinhai_revolution/02_republic.mp3',  // 南京光明（复用republic）
            XINHAI_LINGTAI_ELEGY: 'music/xinhai_revolution/03_memorial.mp3',   // 灵台挽歌（复用memorial）
            // ===== 戊戌变法场景 BGM =====
            WUXU_THEATER: 'music/reform_movement/01_dawn.mp3',            // 时空剧场 - 黎明
            WUXU_CRISIS: 'music/reform_movement/01_dawn.mp3',             // 民族危机 - 紧迫黎明
            WUXU_REFORM: 'music/reform_movement/02_reform.mp3',           // 百日维新 - 改革
            WUXU_COUP: 'music/reform_movement/03_sacrifice_v2.mp3',       // 戊戌政变 - 牺牲
            WUXU_SORROW: 'music/reform_movement/03_sacrifice_v2.mp3',     // 变法失败 - 悲伤
            WUXU_LEGACY: 'music/reform_movement/02_reform.mp3',           // 维新精神 - 改革遗产
        },
        SFX: {
            CLICK: 'audio/sfx/click.wav',              // UI 点击（Kenney, CC0）
            TRANSITION: 'audio/sfx/switch.wav',        // 场景切换（Kenney, CC0）
            VALUE_UP: 'audio/sfx/click.wav',           // 数值上升
            VALUE_DOWN: 'audio/sfx/click.wav',         // 数值下降
            COLLECTIBLE: 'audio/sfx/rollover.wav',     // 收集品（Kenney, CC0）
            // 新增音效
            RAIN: 'audio/sfx/rain.wav',                // 雨声环境（Ylmir, CC0）
            RAIN_HEAVY: 'audio/sfx/rain_heavy.wav',    // 暴雨（Ylmir, CC0）
            SWISH: 'audio/sfx/swish_3.wav',            // 挥剑/动作（artisticdude, CC0）
            BOW: 'audio/sfx/Bow.wav',                  // 弓箭（artisticdude, CC0）
            GUNFIRE: 'audio/sfx/Bow.wav',              // 枪声（复用弓箭音效）
            CHEERING: 'audio/sfx/click.wav',            // 欢呼声（复用点击音效）
            SILENCE: '',                                      // 静音（无环境音效）
            // 戊戌变法场景 SFX
            CROWD_MURMUR: 'audio/sfx/rain.wav',         // 人群低语（复用rain）
            WIND_COLD: 'audio/sfx/rain_heavy.wav',      // 冷风（复用heavy rain）
            PALACE_AMBIENT: 'audio/sfx/switch.wav',     // 宫殿氛围（复用switch）
            AUTUMN_WIND: 'audio/sfx/swish_3.wav',       // 秋风（复用swish）
            DAWN_BIRDS: 'audio/sfx/swish_2.wav',        // 晨鸟（复用swish）
            // 辛亥革命场景 SFX
            SFX_THEATER_AMBIENT: 'audio/sfx/switch.wav',    // 剧场氛围（复用switch）
            SFX_WIND_COLD: 'audio/sfx/rain_heavy.wav',      // 冷风（复用heavy rain）
            SFX_OCEAN_WAVES: 'audio/sfx/rain.wav',          // 海浪（复用rain）
            SFX_CITY_CROWD: 'audio/sfx/rain.wav',           // 城市人群（复用rain）
            SFX_GUNFIRE_DISTANT: 'audio/sfx/Bow.wav',       // 远处枪声（复用Bow）
            SFX_CROWD_CHEER: 'audio/sfx/click.wav',         // 欢呼（复用click）
            SFX_BELL_TOLL: 'audio/sfx/switch.wav',          // 钟声（复用switch）
            SFX_PEN_SCRATCH: 'audio/sfx/rollover.wav',      // 笔触声（复用rollover）
            SFX_MARCHING_BOOTS: 'audio/sfx/swish_3.wav',    // 行军声（复用swish）
            SFX_FIREWORKS: 'audio/sfx/click.wav',           // 烟花（复用click）
            SFX_WIND_GHOSTLY: 'audio/sfx/rain_heavy.wav',   // 鬼风（复用heavy rain）
        }
    };

    // 在首次用户交互时启用音频
    document.addEventListener('click', function initAudio() {
        _ensureAudioContext();
        document.removeEventListener('click', initAudio);
    }, { once: true });

    document.addEventListener('touchstart', function initAudio() {
        _ensureAudioContext();
        document.removeEventListener('touchstart', initAudio);
    }, { once: true });

})();
