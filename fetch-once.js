const fetch = require('node-fetch');

const {
  applyRequestChannelToFetchOptions,
  createRequestChannelAgentCache
} = require('./request-channel-http');

function createFetchOnce(dependencies = {}) {
  const fetchImpl = dependencies.fetchImpl || fetch;
  const agentCache = dependencies.agentCache || createRequestChannelAgentCache();
  const logFailure = typeof dependencies.logFailure === 'function'
    ? dependencies.logFailure
    : null;

  return async function fetchOnce(url, options, requestContext) {
    try {
      const requestOptions = await applyRequestChannelToFetchOptions(
        options && typeof options === 'object' ? options : {},
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
