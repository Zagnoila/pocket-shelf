import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeUrl, makeLink, snapshotToLinks, filterLinks } from './links.js';

test('accepts ordinary links and supplies HTTPS when omitted', () => {
  assert.equal(normalizeUrl(' example.com/path?q=lettuce '), 'https://example.com/path?q=lettuce');
  assert.equal(normalizeUrl('http://example.com'), 'http://example.com/');
});
test('rejects executable links, credentials, and invalid input', () => {
  for (const url of ['', 'not a url', 'javascript:alert(1)', 'data:text/html,hello', 'https://user:secret@example.com', 'https://']) {
    assert.throws(() => normalizeUrl(url));
  }
});
test('creates a useful fallback title and validates categories', () => {
  assert.equal(makeLink('https://www.example.com', '', 'Grow').title, 'example.com');
  assert.throws(() => makeLink('example.com', 'Test', 'Unknown'));
});
test('empty databases render safely; IDs survive object conversion', () => {
  assert.deepEqual(snapshotToLinks(null), []);
  assert.deepEqual(snapshotToLinks({a:{url:'https://example.com',title:'A',createdAt:1}})[0].id, 'a');
});
test('search and collection filters combine without changing source data', () => {
  const links = [{title:'Lettuce',url:'https://example.com',category:'Grow'},{title:'JavaScript',url:'https://scrimba.com',category:'Learn'}];
  assert.equal(filterLinks(links,'Grow','LETT').length,1);
  assert.equal(filterLinks(links,'Learn','lett').length,0);
  assert.equal(links.length,2);
});
