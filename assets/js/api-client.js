(function (global) {
  'use strict';

  function ApiError(message, options) {
    this.name = 'ApiError';
    this.message = message || '请求失败';
    this.status = options && options.status || 0;
    this.code = options && options.code || 'REQUEST_FAILED';
    this.details = options && options.details || null;
  }
  ApiError.prototype = Object.create(Error.prototype);

  var baseUrl = (global.TT_CONFIG && global.TT_CONFIG.apiBaseUrl) || '/api/v1';

  async function request(path, options) {
    options = options || {};
    var controller = new AbortController();
    var timeoutMs = options.timeoutMs || 15000;
    var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
    var headers = Object.assign({ 'Accept': 'application/json' }, options.headers || {});
    var body;

    if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }

    try {
      var response = await fetch(baseUrl + path, {
        method: options.method || 'GET',
        headers: headers,
        body: body,
        credentials: 'same-origin',
        signal: controller.signal
      });
      var payload = null;
      var text = await response.text();
      if (text) {
        try { payload = JSON.parse(text); } catch (e) { payload = { message: text }; }
      }
      if (!response.ok) {
        throw new ApiError((payload && payload.message) || '请求失败', {
          status: response.status,
          code: payload && payload.code,
          details: payload && payload.details
        });
      }
      return payload;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        throw new ApiError('请求超时，已切换本地方案', { code: 'TIMEOUT' });
      }
      if (error instanceof ApiError) throw error;
      throw new ApiError('网络不可用，已切换本地方案', { code: 'NETWORK_ERROR', details: error && error.message });
    } finally {
      clearTimeout(timer);
    }
  }

  global.TTApi = {
    ApiError: ApiError,
    getBaseUrl: function () { return baseUrl; },
    setBaseUrl: function (value) { baseUrl = String(value || '/api/v1').replace(/\/$/, ''); },
    request: request,
    get: function (path, options) { return request(path, Object.assign({}, options, { method: 'GET' })); },
    post: function (path, body, options) { return request(path, Object.assign({}, options, { method: 'POST', body: body })); },
    patch: function (path, body, options) { return request(path, Object.assign({}, options, { method: 'PATCH', body: body })); },
    delete: function (path, body, options) { return request(path, Object.assign({}, options, { method: 'DELETE', body: body })); }
  };
})(window);
