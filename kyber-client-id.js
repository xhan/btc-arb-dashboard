const DEFAULT_KYBER_CLIENT_ID = 'xh-quote-dashboard';
const DEFAULT_KYBER_CLIENT_ID_SUFFIX_COUNT = 0;

function normalizeKyberClientId(baseClientId) {
  if (typeof baseClientId !== 'string') return DEFAULT_KYBER_CLIENT_ID;
  const trimmed = baseClientId.trim();
  return trimmed || DEFAULT_KYBER_CLIENT_ID;
}

function normalizeSuffixCount(suffixCount) {
  const parsed = Number.parseInt(suffixCount, 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    return DEFAULT_KYBER_CLIENT_ID_SUFFIX_COUNT;
  }
  return parsed;
}

function pickKyberClientId(baseClientId, suffixCount, randomFn = Math.random) {
  const normalizedBase = normalizeKyberClientId(baseClientId);
  const normalizedCount = normalizeSuffixCount(suffixCount);
  const totalCandidates = normalizedCount + 1;
  const raw = Number(randomFn());
  const safeRandom = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), 0.999999999999) : 0;
  const index = Math.floor(safeRandom * totalCandidates);

  if (index === 0) return normalizedBase;
  return `${normalizedBase}${index}`;
}

module.exports = {
  DEFAULT_KYBER_CLIENT_ID,
  DEFAULT_KYBER_CLIENT_ID_SUFFIX_COUNT,
  pickKyberClientId
};
