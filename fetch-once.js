const fetch = require('node-fetch');

const {
  applyRequestChannelToFetchOptions,
  createRequestChannelAgentCache
} = require('./request-channel-http');

const DEFAULT_BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

function withDefaultBrowserUserAgent(options = {}) {
  const headers = options && options.headers && typeof options.headers === 'object'
    ? { ...options.headers }
    : {};
  const hasUserAgent = Object.keys(headers).some((key) => String(key).toLowerCase() === 'user-agent');
  if (!hasUserAgent) {
    headers['User-Agent'] = DEFAULT_BROWSER_USER_AGENT;
  }
  return {
    ...options,
    headers
  };
}

function createFetchOnce(dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl || fetch;
  const agentCache = dependencies.agentCache || createRequestChannelAgentCache();
  const logFailure = typeof dependencies.logFailure === 'function'
    ? dependencies.logFailure
    : null;

  return async function fetchOnce(url, options, requestContext) {
    try {
      const requestOptions = await applyRequestChannelToFetchOptions(
        withDefaultBrowserUserAgent(options && typeof options === 'object' ? options : {}),
        requestContext,
        agentCache
      );
      const response = await fetchImpl(url, requestOptions);
      if (!response.ok) {
        const errorText = await response.text();

        try {
          const errorKv = JSON.parse(errorText);
          if (errorKv.reason) throw new Error(errorKv.reason);
          if (errorKv.message) throw new Error(errorKv.message);

          if (errorKv.code && errorKv.validationErrors) {
            const details = errorKv.validationErrors.map((item) => item.reason || item.field).join(', ');
            throw new Error(`0x校验错误: ${details}`);
          }
        } catch (error) {
          if (!(error instanceof SyntaxError)) {
            throw error;
          }
        }

        throw new Error(`API响应错误: ${response.status} ${response.statusText} - ${errorText}`);
      }
      return response;
    } catch (error) {
      if (error && error.name === 'AbortError') throw error;
      if (logFailure) {
        logFailure(url, error);
      }
      throw error;
    }
  };
}

module.exports = {
  createFetchOnce
};
