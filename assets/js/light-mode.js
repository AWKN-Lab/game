/**
 * LightMode — 轻量资源模式（总 PRD MOD-OPS-03 P1「资源按剧本加载 / 轻量模式 / Service Worker 缓存」）
 *
 * 弱网、省流量或低性能设备场景下：
 *  - 跳过 BGM 与音效加载（AudioManager 拦截，页面代码无需改动）；
 *  - 图片懒加载；
 *  - 压缩动画与过渡；
 *  - 注册 Service Worker 缓存核心外壳资源（见根目录 sw.js）。
 *
 * 模式取值（localStorage st_light_mode）：'auto'（默认，按 saveData/2G 自动判定）| 'on' | 'off'。
 * 页面可通过 window.LightMode.enabled() / .set(mode) 读取或切换，切换后立即生效。
 *
 * 自动静音提示：auto 判定拦截 BGM 时展示一次性提示（用户可感知音乐为何不响）；
 * 关闭轻量模式时自动恢复最近被拦截的 BGM。
 */
(function (global) {
    'use strict';

    var KEY = 'st_light_mode';
    var ROOT_CLASS = 'tt-light';
    var STYLE_ID = 'tt-light-style';
    var lastBlockedBGM = null;
    var autoToastShown = false;

    function storedMode() {
        try { return localStorage.getItem(KEY) || 'auto'; } catch (e) { return 'auto'; }
    }

    function autoDetect() {
        try {
            var conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection || {};
            if (conn.saveData) return true;
            if (/^2g$/i.test(conn.effectiveType || '')) return true;
        } catch (e) { /* 忽略探测失败 */ }
        return false;
    }

    function enabled() {
        var mode = storedMode();
        if (mode === 'on') return true;
        if (mode === 'off') return false;
        return autoDetect();
    }

    function set(mode) {
        if (['auto', 'on', 'off'].indexOf(mode) === -1) return enabled();
        try { localStorage.setItem(KEY, mode); } catch (e) { /* 存储不可用时仅本次生效 */ }
        apply();
        if (!enabled() && lastBlockedBGM && global.AudioManager && typeof global.AudioManager.playBGM === 'function') {
            var src = lastBlockedBGM;
            lastBlockedBGM = null;
            try { global.AudioManager.playBGM(src); } catch (e) { /* 恢复失败不影响模式切换 */ }
        }
        return enabled();
    }

    function showToast() {
        if (document.getElementById('tt-light-toast')) return;
        var toast = document.createElement('div');
        toast.id = 'tt-light-toast';
        toast.setAttribute('role', 'status');
        toast.textContent = '🍃 轻量模式已自动静音背景音乐（省流量）——点右下角「轻量模式」按钮可恢复';
        toast.style.cssText = 'position:fixed;left:50%;transform:translateX(-50%);bottom:76px;z-index:9999;'
            + 'background:rgba(30,60,40,.92);color:#fff;padding:10px 16px;border-radius:10px;'
            + 'font-size:14px;line-height:1.5;max-width:82vw;box-shadow:0 4px 14px rgba(0,0,0,.25);';
        document.body.appendChild(toast);
        setTimeout(function () {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 6000);
    }

    function injectStyle() {
        if (document.getElementById(STYLE_ID)) return;
        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            'html.' + ROOT_CLASS + ' *, html.' + ROOT_CLASS + ' *::before, html.' + ROOT_CLASS + ' *::after {',
            '  animation-duration: 0.01ms !important; animation-iteration-count: 1 !important;',
            '  transition-duration: 0.01ms !important; scroll-behavior: auto !important;',
            '}'
        ].join('\n');
        document.head.appendChild(style);
    }

    function lazyImages() {
        var images = document.querySelectorAll('img:not([loading])');
        for (var i = 0; i < images.length; i++) {
            try { images[i].setAttribute('loading', 'lazy'); } catch (e) { /* 忽略 */ }
        }
    }

    function patchAudio() {
        if (!global.AudioManager || global.AudioManager._lightPatched) return;
        global.AudioManager._lightPatched = true;
        var originalBGM = global.AudioManager.playBGM;
        global.AudioManager.playBGM = function (src) {
            if (enabled()) {
                console.log('[LightMode] 轻量模式：跳过 BGM 加载', src);
                lastBlockedBGM = src;
                if (storedMode() === 'auto' && !autoToastShown) {
                    autoToastShown = true;
                    showToast();
                }
                return;
            }
            return originalBGM.call(global.AudioManager, src);
        };
        if (typeof global.AudioManager.playSFX === 'function') {
            var originalSFX = global.AudioManager.playSFX;
            global.AudioManager.playSFX = function () {
                if (enabled()) return;
                return originalSFX.apply(global.AudioManager, arguments);
            };
        }
    }

    function registerServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        var secure = location.protocol === 'https:' ||
            location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        if (!secure) return; // Service Worker 仅在安全上下文可用
        navigator.serviceWorker.register('/sw.js').catch(function (error) {
            console.warn('[LightMode] Service Worker 注册失败：', error && error.message);
        });
    }

    function apply() {
        var on = enabled();
        if (on) {
            document.documentElement.classList.add(ROOT_CLASS);
            injectStyle();
            lazyImages();
        } else {
            document.documentElement.classList.remove(ROOT_CLASS);
        }
        patchAudio();
        return on;
    }

    function bindToggle() {
        var button = document.getElementById('tt-light-toggle');
        if (!button || button._lightBound) return;
        button._lightBound = true;
        var render = function () {
            var on = enabled();
            button.textContent = on ? '🍃 轻量模式：开' : '🍃 轻量模式：关';
            button.setAttribute('aria-pressed', on ? 'true' : 'false');
        };
        button.addEventListener('click', function () {
            set(enabled() ? 'off' : 'on');
            render();
        });
        render();
    }

    global.LightMode = {
        enabled: enabled,
        set: set,
        apply: apply,
        mode: storedMode
    };

    // 脚本以 defer 方式加载，DOM 就绪后执行
    function boot() {
        apply();
        bindToggle();
        registerServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})(window);
