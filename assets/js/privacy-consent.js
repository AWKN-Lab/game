/**
 * 隐私与数据采集告知条
 * 面向乡村学校与未成年人：匿名行为采集默认关闭，首次访问展示简洁说明，由用户或教师主动开启。
 * 依赖：assets/js/identity-client.js
 */
(function (global) {
  'use strict';

  var STYLE_ID = 'tt-consent-style';
  var BAR_ID = 'tt-consent-bar';

  var CSS = [
    '#' + BAR_ID + '{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);width:min(880px,calc(100% - 24px));',
    'z-index:2000;border:1px solid rgba(170,190,220,.24);border-radius:16px;padding:14px 16px;',
    'background:linear-gradient(165deg,rgba(18,38,64,.98),rgba(9,23,40,.99));box-shadow:0 24px 80px rgba(0,0,0,.45);',
    'color:#eef4ff;font-family:Inter,"Noto Sans SC","Microsoft YaHei",system-ui,sans-serif;font-size:13px;line-height:1.7;',
    'display:flex;gap:14px;align-items:center;flex-wrap:wrap;justify-content:space-between}',
    '#' + BAR_ID + ' .tt-consent-text{flex:1 1 420px;min-width:260px;color:#d5e0ee}',
    '#' + BAR_ID + ' strong{color:#e9c46a}',
    '#' + BAR_ID + ' a{color:#67e8f9}',
    '#' + BAR_ID + ' .tt-consent-actions{display:flex;gap:8px;flex-wrap:wrap}',
    '#' + BAR_ID + ' button{appearance:none;border:1px solid rgba(170,190,220,.24);border-radius:11px;padding:9px 14px;',
    'background:rgba(15,31,52,.85);color:#eef4ff;font:inherit;cursor:pointer;transition:.2s}',
    '#' + BAR_ID + ' button:hover{border-color:rgba(103,232,249,.55)}',
    '#' + BAR_ID + ' button.primary{background:linear-gradient(135deg,#1f5d83,#19385c);border-color:rgba(103,232,249,.5)}',
    '@media(max-width:600px){#' + BAR_ID + '{bottom:8px;padding:12px}#' + BAR_ID + ' .tt-consent-actions{width:100%}',
    '#' + BAR_ID + ' button{flex:1}}'
  ].join('');

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  function close() {
    var bar = document.getElementById(BAR_ID);
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function decide(enabled) {
    if (global.TTIdentity && global.TTIdentity.setTrackingEnabled) global.TTIdentity.setTrackingEnabled(enabled);
    if (!enabled && global.TTEvents && global.TTEvents.clearQueue) global.TTEvents.clearQueue();
    close();
    document.dispatchEvent(new CustomEvent('tt:tracking-decided', { detail: { enabled: !!enabled } }));
  }

  function render() {
    if (document.getElementById(BAR_ID)) return;
    injectStyle();
    var bar = document.createElement('section');
    bar.id = BAR_ID;
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', '数据采集说明');
    bar.innerHTML = [
      '<div class="tt-consent-text"><strong>学习数据默认不采集。</strong>',
      '开启后我们只记录匿名的学习行为（进入哪一幕、做了什么选择、答题对错），',
      '用于生成你的学习复盘，<b>不收集姓名、手机号、位置或人脸</b>，保存 180 天，随时可关闭并删除。',
      '未成年人请在教师或家长知情后开启。<a href="privacy.html" target="_blank" rel="noopener">查看完整说明</a></div>',
      '<div class="tt-consent-actions">',
      '<button type="button" data-tt-consent="off">暂不开启</button>',
      '<button type="button" class="primary" data-tt-consent="on">开启并帮助改进</button>',
      '</div>'
    ].join('');
    document.body.appendChild(bar);
    bar.addEventListener('click', function (event) {
      var action = event.target.getAttribute && event.target.getAttribute('data-tt-consent');
      if (action === 'on') decide(true);
      if (action === 'off') decide(false);
    });
  }

  function boot() {
    if (!global.TTIdentity || !global.TTIdentity.hasTrackingDecision) return;
    if (global.TTIdentity.hasTrackingDecision()) return;
    render();
  }

  global.TTConsent = { show: render, hide: close, decide: decide };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})(window);
