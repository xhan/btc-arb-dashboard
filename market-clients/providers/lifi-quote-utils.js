function toPositiveBigInt(value) {
  if (value === undefined || value === null) return null;
  try {
    const parsed = BigInt(String(value));
    if (parsed <= 0n) return null;
    return parsed;
  } catch (_) {
    return null;
  }
}

function getDisplayedToAmountRaw(quoteData) {
  const fallbackToAmount = quoteData?.estimate?.toAmount;
  const fallbackRaw = toPositiveBigInt(fallbackToAmount);
  if (!fallbackRaw) return null;

  const rootFromAmount = toPositiveBigInt(quoteData?.action?.fromAmount);
  const swapStep = Array.isArray(quoteData?.includedSteps)
    ? quoteData.includedSteps.find((step) => step?.type === 'swap')
    : null;

  const swapFromAmount = toPositiveBigInt(swapStep?.action?.fromAmount);
  const swapToAmount = toPositiveBigInt(swapStep?.estimate?.toAmount);

  if (!rootFromAmount || !swapFromAmount || !swapToAmount) {
    return fallbackRaw.toString();
  }

  // Align with Jumper display: use swap rate before protocol fee deduction.
  const displayed = (swapToAmount * rootFromAmount) / swapFromAmount;
  return displayed.toString();
}

module.exports = {
  getDisplayedToAmountRaw
};
