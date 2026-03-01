const EKUBO_STARKNET_CHAIN_ID = '0x534e5f4d41494e';
const EKUBO_STARKNET_QUOTER_CHAIN_ID = '23448594291968334';

function toPositiveBigIntString(value) {
  if (value === undefined || value === null) return null;
  try {
    const parsed = BigInt(String(value));
    if (parsed <= 0n) return null;
    return parsed.toString();
  } catch (_) {
    return null;
  }
}

function normalizeHexAddress(address) {
  const raw = String(address || '').trim().toLowerCase();
  if (!raw.startsWith('0x')) return raw;
  const normalizedBody = raw.slice(2).replace(/^0+/, '') || '0';
  return `0x${normalizedBody}`;
}

function buildEkuboQuoteUrl(input) {
  const amountInRaw = toPositiveBigIntString(input?.amountInRaw);
  const fromToken = normalizeHexAddress(input?.fromToken);
  const toToken = normalizeHexAddress(input?.toToken);

  if (!amountInRaw || !fromToken || !toToken) {
    throw new Error('Ekubo 缺少必要报价参数');
  }

  return `https://prod-api-quoter.ekubo.org/${EKUBO_STARKNET_QUOTER_CHAIN_ID}/${amountInRaw}/${fromToken}/${toToken}`;
}

function extractEkuboAmountOutRaw(quoteData) {
  const amountOutRaw = toPositiveBigIntString(quoteData?.total_calculated);
  if (!amountOutRaw) {
    throw new Error('Ekubo 未返回有效报价');
  }
  return amountOutRaw;
}

function formatUnitsToNumber(rawAmount, decimals) {
  const raw = toPositiveBigIntString(rawAmount);
  if (!raw) return null;

  const decimalsInt = Math.max(0, Number.parseInt(decimals, 10) || 0);
  if (decimalsInt === 0) {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  const padded = raw.padStart(decimalsInt + 1, '0');
  const whole = padded.slice(0, -decimalsInt);
  const fraction = padded.slice(-decimalsInt);
  const parsed = Number(`${whole}.${fraction}`);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildEkuboQuoteResult(input) {
  const amount = Number(input?.amount);
  const safeAmount = Number.isFinite(amount) && amount > 0 ? amount : 1;
  const amountOut = formatUnitsToNumber(input?.amountOutRaw, input?.toMeta?.decimals);

  if (!Number.isFinite(amountOut) || amountOut <= 0) {
    throw new Error('Ekubo 未返回有效价格');
  }

  return {
    fromSymbol: input?.fromMeta?.symbol || '???',
    toSymbol: input?.toMeta?.symbol || '???',
    amountOut,
    raw_price: amountOut / safeAmount,
    source: 'Ekubo'
  };
}

module.exports = {
  EKUBO_STARKNET_CHAIN_ID,
  EKUBO_STARKNET_QUOTER_CHAIN_ID,
  buildEkuboQuoteUrl,
  extractEkuboAmountOutRaw,
  buildEkuboQuoteResult
};
