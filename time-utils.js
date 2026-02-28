const UTC8_OFFSET_MS = 8 * 60 * 60 * 1000;

function normalizeTimeText(input) {
  const text = String(input || '').trim();
  if (!text) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return `${text}T00:00:00`;
  }
  return text.replace(' ', 'T');
}

function hasExplicitTimezone(text) {
  return /(?:Z|[+-]\d{2}:\d{2})$/i.test(text);
}

function parseUtc8Input(input) {
  if (input instanceof Date) {
    return new Date(input.getTime());
  }

  const normalized = normalizeTimeText(input);
  if (!normalized) {
    return new Date(NaN);
  }

  const source = hasExplicitTimezone(normalized)
    ? normalized
    : `${normalized}+08:00`;

  return new Date(source);
}

function formatUtc8(input) {
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const shifted = new Date(date.getTime() + UTC8_OFFSET_MS)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');

  return `${shifted} +08:00`;
}

module.exports = {
  parseUtc8Input,
  formatUtc8
};
