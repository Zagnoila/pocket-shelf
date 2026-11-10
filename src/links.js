export const categories = ['Learn', 'Make', 'Grow', 'Everyday'];

// A URL is an address. Only ordinary web addresses belong on this shelf.
export function normalizeUrl(value) {
  const trimmed = value.trim();
  if (!trimmed || /\s/.test(trimmed)) throw new Error('Enter a website link without spaces.');
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(trimmed);
  const url = new URL(hasScheme ? trimmed : `https://${trimmed}`);
  if (!['https:', 'http:'].includes(url.protocol) || !url.hostname.includes('.') || url.username || url.password) {
    throw new Error('Use a full http or https website link.');
  }
  if (url.href.length > 2048) throw new Error('This link is too long.');
  return url.href;
}

export function makeLink(urlValue, titleValue, category) {
  const url = normalizeUrl(urlValue);
  const title = titleValue.trim() || new URL(url).hostname.replace(/^www\./, '');
  if (title.length > 100) throw new Error('Keep the name under 100 characters.');
  if (!categories.includes(category)) throw new Error('Choose a collection.');
  return { url, title, category, createdAt: Date.now() };
}

export function snapshotToLinks(value) {
  return Object.entries(value || {})
    .filter(([, item]) => item && typeof item.url === 'string' && typeof item.title === 'string')
    .map(([id, item]) => ({ ...item, id }))
    .sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
}

export function filterLinks(links, category, query) {
  const term = query.trim().toLowerCase();
  return links.filter(link => (category === 'All' || link.category === category) &&
    `${link.title} ${link.url} ${link.category}`.toLowerCase().includes(term));
}
