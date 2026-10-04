export function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Matches at the start of a word: "pho" matches "Phone Case" but not "iPhone".
export function wordPrefixRegExp(query) {
  const pattern = query.trim().split(/\s+/).map(escapeRegExp).join('\\s+')
  return new RegExp(`(?:^|\\W)(${pattern})`, 'i')
}
