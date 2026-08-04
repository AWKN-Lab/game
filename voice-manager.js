// ============================================================
// VoiceManager - 语音管理器
// 管理游戏对话的语音播放，支持角色声音区分和打字机同步
// ============================================================
(function() {
    'use strict';

    // ---- 内部状态 ----
    var _voiceEnabled = false;     // 语音总开关（默认关闭，等GPT-SoVITS配音就绪后开启）
    var _voiceVolume = 0.8;        // 语音音量 (0-1)
    var _currentAudio = null;      // 当前播放的 Audio 对象
    var _currentIndex = -1;        // 当前播放的对话索引
    var _voiceData = null;         // 语音索引数据
    var _isLoaded = false;         // 索引是否已加载
    var _preloadedCache = {};      // 预加载缓存

    // ---- 中文名 -> 英文ID 映射 ----
    var _speakerNameMap = {
        '旁白': 'narrator',
        '子衿': 'fulina',
        '洛书': 'hutao',
        '路易十六': 'louis',
        '罗伯斯庇尔': 'robespierre',
        '拿破仑': 'napoleon',
        '玛丽·安托瓦内特': 'marie'
    };

    // ---- 加载语音索引 ----
    function _loadVoiceIndex(callback) {
        if (_isLoaded) { callback && callback(true); return; }
        var xhr = new XMLHttpRequest();
        xhr.open('GET', 'game/audio/voice/voice_index.json', true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    _voiceData = JSON.parse(xhr.responseText);
                    _isLoaded = true;
                    console.log('[VoiceManager] 语音索引加载成功，共',
                        (_voiceData.dialog ? _voiceData.dialog.length : 0), '条主对话，',
                        (_voiceData.afterlife ? _voiceData.afterlife.length : 0), '条来世结局，',
                        (_voiceData.dramatic ? _voiceData.dramatic.length : 0), '条戏剧结局');
                    callback && callback(true);
                } catch(e) {
                    console.warn('[VoiceManager] 语音索引解析失败:', e);
                    callback && callback(false);
                }
            } else {
                console.warn('[VoiceManager] 语音索引加载失败, HTTP', xhr.status);
                callback && callback(false);
            }
        };
        xhr.onerror = function() {
            console.warn('[VoiceManager] 语音索引加载网络错误');
            callback && callback(false);
        };
        xhr.send();
    }

    // ---- 停止当前语音 ----
    function _stopCurrent() {
        if (_currentAudio) {
            _currentAudio.pause();
            _currentAudio.currentTime = 0;
            _currentAudio = null;
        }
    }

    // ---- 查找语音文件 ----
    function _findVoiceFile(speakerId, dialogIndex, source) {
        if (!_voiceData) return null;
        var list;
        if (source === 'afterlife') list = _voiceData.afterlife;
        else if (source === 'dramatic') list = _voiceData.dramatic;
        else list = _voiceData.dialog;

        if (!list) return null;
        for (var i = 0; i < list.length; i++) {
            if (list[i].index === dialogIndex && list[i].speaker === speakerId) {
                return list[i];
            }
        }
        return null;
    }

    // ---- 公开 API ----
    window.VoiceManager = {
        // 初始化（游戏开始时调用）
        init: function(callback) {
            _loadVoiceIndex(callback);
        },

        // 是否可用
        isAvailable: function() {
            return _isLoaded && _voiceData !== null;
        },

        // 播放指定对话的语音
        // speakerId: 角色英文ID (fulina/hutao/louis/...)
        // dialogIndex: 对话在数组中的索引
        // source: 'dialog' | 'afterlife' | 'dramatic'
        // onEnd: 播放结束回调
        // 返回: voiceInfo 对象 { file, duration, text, speaker } 或 null
        play: function(speakerId, dialogIndex, source, onEnd) {
            _stopCurrent();
            if (!_voiceEnabled || !_isLoaded) {
                onEnd && onEnd();
                return null;
            }
            var voiceInfo = _findVoiceFile(speakerId, dialogIndex, source);
            if (!voiceInfo) {
                onEnd && onEnd();
                return null;
            }

            var audio = new Audio(voiceInfo.file);
            audio.volume = _voiceVolume;
            _currentAudio = audio;
            _currentIndex = dialogIndex;

            audio.onended = function() {
                _currentAudio = null;
                onEnd && onEnd();
            };
            audio.onerror = function() {
                console.warn('[VoiceManager] 播放失败:', voiceInfo.file);
                _currentAudio = null;
                onEnd && onEnd();
            };

            var promise = audio.play();
            if (promise && promise.catch) {
                promise.catch(function(err) {
                    console.warn('[VoiceManager] play() 被阻止:', err);
                });
            }
            return voiceInfo;
        },

        // 停止当前语音
        stop: function() {
            _stopCurrent();
        },

        // 语音开关
        toggle: function() {
            _voiceEnabled = !_voiceEnabled;
            if (!_voiceEnabled) _stopCurrent();
            return _voiceEnabled;
        },

        isEnabled: function() {
            return _voiceEnabled;
        },

        // 音量控制
        setVolume: function(v) {
            _voiceVolume = Math.max(0, Math.min(1, v));
            if (_currentAudio) _currentAudio.volume = _voiceVolume;
        },

        getVolume: function() {
            return _voiceVolume;
        },

        // 将中文名映射到 speaker ID
        resolveSpeakerId: function(name) {
            return _speakerNameMap[name] || name;
        },

        // 预加载后续语音（减少播放延迟）
        preload: function(indices, source) {
            if (!_voiceData) return;
            source = source || 'dialog';
            var list = _voiceData[source];
            if (!list) return;

            indices.forEach(function(idx) {
                for (var i = 0; i < list.length; i++) {
                    if (list[i].index === idx) {
                        var key = source + '_' + idx;
                        if (!_preloadedCache[key]) {
                            var a = new Audio();
                            a.preload = 'auto';
                            a.src = list[i].file;
                            _preloadedCache[key] = a;
                        }
                        break;
                    }
                }
            });
        }
    };

})();
