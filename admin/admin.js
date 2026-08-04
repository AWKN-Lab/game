(function (global) {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, function (character) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[character];
    });
  }
  function formatTime(value) { try { return new Date(value).toLocaleString('zh-CN', { hour12: false }); } catch { return value || ''; } }
  function query(name) { return new URLSearchParams(location.search).get(name) || ''; }
  function statusText(value) { return ({new:'新反馈',reviewing:'处理中',replied:'已回复',resolved:'已解决',closed:'已关闭',pending_review:'待审核',needs_info:'需要补充',public:'已公开',researching:'调研中',planned:'已计划',developing:'开发中',implemented:'已实现',duplicate:'重复',not_planned:'暂不采纳',rejected:'拒绝'})[value] || value; }

  var page = document.body.dataset.page || '';
  var currentAdmin = null;

  async function me() {
    try { var response = await TTApi.get('/admin/auth/me'); currentAdmin = response.admin; return currentAdmin; }
    catch (error) { if (page !== 'login') location.replace('login.html?next=' + encodeURIComponent(location.pathname + location.search)); throw error; }
  }

  function setTopbar() {
    var email = document.getElementById('adminEmail'); if (email && currentAdmin) email.textContent = currentAdmin.email;
    var button = document.getElementById('logoutButton');
    if (button) button.addEventListener('click', async function () { try { await TTApi.post('/admin/auth/logout', {}); } finally { location.replace('login.html'); } });
    document.querySelectorAll('.admin-menu a').forEach(function (link) { if (link.dataset.page === page) link.classList.add('active'); });
  }

  async function loginPage() {
    try { await TTApi.get('/admin/auth/me'); location.replace('index.html'); return; } catch {}
    var form = document.getElementById('loginForm');
    form.addEventListener('submit', async function (event) {
      event.preventDefault(); var status = document.getElementById('loginStatus'); var button = document.getElementById('loginButton');
      button.disabled = true; status.textContent = '正在登录…';
      try {
        await TTApi.post('/admin/auth/login', { email: document.getElementById('email').value, password: document.getElementById('password').value }, { timeoutMs: 8000 });
        var next = query('next'); location.replace(next && next.startsWith('/') ? next : 'index.html');
      } catch (error) { status.textContent = error.message || '登录失败'; }
      finally { button.disabled = false; }
    });
  }

  async function dashboardPage() {
    var response = await TTApi.get('/admin/dashboard'); var counts = response.counts || {};
    var labels = {
      sessionsToday:'今日会话',eventsToday:'今日互动',scriptsStartedToday:'剧本开始',scriptsEndedToday:'剧本完成',aiRunsToday:'AI/规则生成',aiRuleFallbackToday:'规则降级',newFeedback:'新反馈',pendingWishes:'待审愿望'
    };
    var grid = document.getElementById('dashboardGrid'); grid.innerHTML = '';
    Object.keys(labels).forEach(function (key) { var card = document.createElement('article'); card.className = 'tt-card tt-stat'; card.innerHTML = '<strong>' + Number(counts[key] || 0) + '</strong><span>' + labels[key] + '</span>'; grid.appendChild(card); });
  }

  async function interactionsPage() {
    var offset = 0; var limit = 50;
    async function load(reset) {
      if (reset) offset = 0;
      var params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
      ['actorId','sessionId','name','scriptId'].forEach(function (name) { var input = document.getElementById(name); if (input && input.value.trim()) params.set(name, input.value.trim()); });
      var list = document.getElementById('eventList'); list.innerHTML = '<div class="tt-loading"><span class="tt-spinner"></span>读取事件…</div>';
      var response = await TTApi.get('/admin/events?' + params.toString()); var items = response.items || [];
      if (!items.length) { list.innerHTML = '<div class="tt-note">没有符合条件的事件。</div>'; return; }
      list.innerHTML = items.map(function (item) {
        return '<article class="admin-event"><time>' + escapeHtml(formatTime(item.occurred_at)) + '</time><div><code>' + escapeHtml(item.name) + '</code><br><a href="actor.html?id=' + encodeURIComponent(item.actor_id || '') + '">' + escapeHtml((item.actor_id || '无actor').slice(0,18)) + '</a></div><div><strong>' + escapeHtml(item.page || '') + '</strong><pre>' + escapeHtml(JSON.stringify(item.payload || {}, null, 2)) + '</pre></div></article>';
      }).join('');
      document.getElementById('offsetLabel').textContent = (offset + 1) + ' - ' + (offset + items.length);
      document.getElementById('prevButton').disabled = offset === 0;
      document.getElementById('nextButton').disabled = items.length < limit;
    }
    document.getElementById('filterForm').addEventListener('submit', function (event) { event.preventDefault(); load(true); });
    document.getElementById('prevButton').addEventListener('click', function () { offset = Math.max(0, offset - limit); load(); });
    document.getElementById('nextButton').addEventListener('click', function () { offset += limit; load(); });
    load(true);
  }

  async function actorPage() {
    var actorId = query('id'); if (!actorId) throw new Error('缺少 actor id');
    var response = await TTApi.get('/admin/actors/' + encodeURIComponent(actorId));
    document.getElementById('actorTitle').textContent = '匿名用户 ' + actorId.slice(0, 24);
    document.getElementById('actorMeta').textContent = '角色：' + response.actor.role + '｜首次：' + formatTime(response.actor.first_seen_at) + '｜最近：' + formatTime(response.actor.last_seen_at);
    var timeline = document.getElementById('timeline');
    timeline.innerHTML = (response.events || []).map(function (event) { return '<article class="admin-event"><time>' + escapeHtml(formatTime(event.occurred_at)) + '</time><code>' + escapeHtml(event.name) + '</code><div><strong>' + escapeHtml(event.page || '') + '</strong><pre>' + escapeHtml(JSON.stringify(event.payload || {}, null, 2)) + '</pre></div></article>'; }).join('') || '<div class="tt-note">暂无事件。</div>';
    document.getElementById('actorFeedback').innerHTML = (response.feedback || []).map(function (item) { return '<div class="tt-card"><span class="tt-chip">' + statusText(item.status) + '</span><p>' + escapeHtml(item.message) + '</p></div>'; }).join('') || '<p class="tt-muted">无反馈</p>';
    document.getElementById('actorWishes').innerHTML = (response.wishes || []).map(function (item) { return '<div class="tt-card"><span class="tt-chip">' + statusText(item.status) + '</span><h3>' + escapeHtml(item.title) + '</h3></div>'; }).join('') || '<p class="tt-muted">无愿望</p>';
  }

  async function feedbackPage() {
    async function load() {
      var status = document.getElementById('statusFilter').value; var suffix = status ? '?status=' + encodeURIComponent(status) : '';
      var response = await TTApi.get('/admin/feedback' + suffix); var list = document.getElementById('feedbackList');
      list.innerHTML = (response.items || []).map(function (item) {
        return '<article class="tt-card" data-id="' + escapeHtml(item.id) + '"><div class="tt-section-title"><div><span class="tt-chip">' + escapeHtml(statusText(item.status)) + '</span><h3>' + escapeHtml(item.category) + ' · ' + escapeHtml(item.publicId) + '</h3></div><a href="actor.html?id=' + encodeURIComponent(item.actorId || '') + '">查看用户路径</a></div><p>' + escapeHtml(item.message) + '</p><p class="tt-muted">' + escapeHtml(item.scriptId || '') + ' · ' + escapeHtml(formatTime(item.createdAt)) + '</p><div class="tt-form-row"><select class="tt-select js-status">' + ['new','reviewing','replied','resolved','closed'].map(function(s){return '<option value="'+s+'" '+(s===item.status?'selected':'')+'>'+statusText(s)+'</option>'}).join('') + '</select><textarea class="tt-textarea admin-textarea js-reply" placeholder="给用户的回复">' + escapeHtml(item.adminReply || '') + '</textarea></div><button class="tt-btn primary js-save" type="button">保存处理结果</button> <span class="tt-muted js-result"></span></article>';
      }).join('') || '<div class="tt-note">暂无反馈。</div>';
    }
    document.getElementById('statusFilter').addEventListener('change', load);
    document.getElementById('feedbackList').addEventListener('click', async function (event) {
      var button = event.target.closest('.js-save'); if (!button) return; var card = button.closest('[data-id]'); var result = card.querySelector('.js-result');
      button.disabled = true; result.textContent = '保存中…';
      try { await TTApi.patch('/admin/feedback/' + encodeURIComponent(card.dataset.id), { status: card.querySelector('.js-status').value, adminReply: card.querySelector('.js-reply').value }); result.textContent = '已保存'; }
      catch (error) { result.textContent = error.message; } finally { button.disabled = false; }
    });
    load();
  }

  async function wishesPage() {
    var statuses = ['pending_review','needs_info','public','researching','planned','developing','implemented','duplicate','not_planned','rejected'];
    async function load() {
      var status = document.getElementById('statusFilter').value; var suffix = status ? '?status=' + encodeURIComponent(status) : '';
      var response = await TTApi.get('/admin/wishes' + suffix); var list = document.getElementById('wishList');
      list.innerHTML = (response.items || []).map(function (item) {
        return '<article class="tt-card" data-id="' + escapeHtml(item.id) + '"><div class="tt-section-title"><div><span class="tt-chip">' + escapeHtml(statusText(item.status)) + '</span><h3>' + escapeHtml(item.title) + '</h3></div><strong>✦ ' + Number(item.voteCount || 0) + '</strong></div><p>' + escapeHtml(item.reason || '') + '</p><p class="tt-muted">' + escapeHtml(item.wishType || '') + ' · ' + escapeHtml(item.grade || '') + ' · ' + escapeHtml(formatTime(item.createdAt)) + '</p><div class="tt-form-row"><select class="tt-select js-status">' + statuses.map(function(s){return '<option value="'+s+'" '+(s===item.status?'selected':'')+'>'+statusText(s)+'</option>'}).join('') + '</select><input class="tt-input js-priority" placeholder="优先级 P0/P1/P2" value="' + escapeHtml(item.priority || '') + '"></div><div class="tt-form-row"><input class="tt-input js-version" placeholder="目标版本" value="' + escapeHtml(item.targetVersion || '') + '"><textarea class="tt-textarea admin-textarea js-reply" placeholder="公开回复">' + escapeHtml(item.adminReply || '') + '</textarea></div><button class="tt-btn primary js-save" type="button">保存治理结果</button> <span class="tt-muted js-result"></span></article>';
      }).join('') || '<div class="tt-note">暂无愿望。</div>';
    }
    document.getElementById('statusFilter').addEventListener('change', load);
    document.getElementById('wishList').addEventListener('click', async function (event) {
      var button = event.target.closest('.js-save'); if (!button) return; var card = button.closest('[data-id]'); var result = card.querySelector('.js-result');
      button.disabled = true; result.textContent = '保存中…';
      try { await TTApi.patch('/admin/wishes/' + encodeURIComponent(card.dataset.id), { status: card.querySelector('.js-status').value, priority: card.querySelector('.js-priority').value, targetVersion: card.querySelector('.js-version').value, adminReply: card.querySelector('.js-reply').value }); result.textContent = '已保存'; }
      catch (error) { result.textContent = error.message; } finally { button.disabled = false; }
    });
    load();
  }

  async function auditPage() {
    var response = await TTApi.get('/admin/audit?limit=150');
    document.getElementById('auditList').innerHTML = (response.items || []).map(function (item) { return '<article class="admin-event"><time>' + escapeHtml(formatTime(item.created_at)) + '</time><code>' + escapeHtml(item.action) + '</code><div><strong>' + escapeHtml(item.entity_type || '') + ' ' + escapeHtml(item.entity_id || '') + '</strong><pre>' + escapeHtml(JSON.stringify({before:item.before,after:item.after},null,2)) + '</pre></div></article>'; }).join('') || '<div class="tt-note">暂无审计记录。</div>';
  }

  document.addEventListener('DOMContentLoaded', async function () {
    if (page === 'login') return loginPage();
    try {
      await me(); setTopbar();
      if (page === 'dashboard') await dashboardPage();
      else if (page === 'interactions') await interactionsPage();
      else if (page === 'actor') await actorPage();
      else if (page === 'feedback') await feedbackPage();
      else if (page === 'wishes') await wishesPage();
      else if (page === 'audit') await auditPage();
    } catch (error) {
      var target = document.getElementById('pageError'); if (target) { target.hidden = false; target.textContent = error.message || '页面加载失败'; }
    }
  });
})(window);
