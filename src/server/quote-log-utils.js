function shortAddr(addr = '') {
    const s = String(addr);
    if (s.length <= 12) return s;
    return `${s.slice(0, 6)}...${s.slice(-4)}`;
}

function getQuoteLogPairLabel(chain, fromSymbol, toSymbol, fromToken, toToken) {
    const left = fromSymbol || shortAddr(fromToken);
    const right = toSymbol || shortAddr(toToken);
    return `${String(chain || '').toLowerCase()} ${left}/${right}`;
}

function getQuoteLogChannelLabel(ctx) {
    const channelId = String(ctx && ctx.channelId || '').trim() || 'default';
    const channelName = String(ctx && ctx.channelName || '').trim();
    if (channelName && channelName !== channelId) {
        return `${channelName}/${channelId}`;
    }
    return channelId;
}

function withQuoteLogRequestChannel(ctx, input) {
    const requestContext = input && input.requestContext ? input.requestContext : null;
    return {
        ...(ctx && typeof ctx === 'object' ? ctx : {}),
        channelId: requestContext && requestContext.channelId ? requestContext.channelId : undefined,
        channelName: requestContext && requestContext.channelName ? requestContext.channelName : undefined
    };
}

function createQuoteLogger({ logMessage, verboseLog }) {
    function logQuoteRequest(source, ctx) {
        const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
        verboseLog(`${source}_REQ`, `${pair} amount=${ctx.amount ?? ''} url=${ctx.url}`);
    }

    function logQuoteResult(source, ctx) {
        const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
        const price = Number.isFinite(ctx.rawPrice) ? ctx.rawPrice : NaN;
        const amountOut = Number.isFinite(ctx.amountOut) ? ctx.amountOut : NaN;
        const priceText = Number.isFinite(price) ? price.toFixed(10) : 'NaN';
        const amountOutText = Number.isFinite(amountOut) ? amountOut.toString() : 'NaN';
        verboseLog(`${source}_RES`, `${pair} 结果=OK price=${priceText} amountOut=${amountOutText}`);
    }

    function logQuoteError(source, ctx, error) {
        const pair = getQuoteLogPairLabel(ctx.chain, ctx.fromSymbol, ctx.toSymbol, ctx.fromToken, ctx.toToken);
        const channel = getQuoteLogChannelLabel(ctx);
        logMessage(`${source}_ERR`, `[channel=${channel}] ${pair} ${error.message}`, 'warn');
    }

    return {
        logQuoteError,
        logQuoteRequest,
        logQuoteResult
    };
}

module.exports = {
    createQuoteLogger,
    getQuoteLogChannelLabel,
    getQuoteLogPairLabel,
    shortAddr,
    withQuoteLogRequestChannel
};
