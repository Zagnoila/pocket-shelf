import './style.css';
import { onValue, push, remove, child, set, update } from 'firebase/database';
import { connectShelf } from './firebase.js';
import { makeLink, normalizeUrl, snapshotToLinks, filterLinks } from './links.js';

const $ = id => document.getElementById(id);
const form = $('save-form');
const list = $('links');
let links = [];
let activeCategory = 'All';
let shelfRef;
let connected = false;
let loaded = false;
let busy = false;
let toastTimer;
let installPrompt;

function notify(message) {
  clearTimeout(toastTimer);
  $('toast').textContent = message;
  $('toast').hidden = false;
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4500);
}

function setControls() {
  const unavailable = !shelfRef || !connected || !loaded || busy;
  $('save-btn').disabled = unavailable;
  $('sample-btn').disabled = unavailable;
  $('clear-btn').disabled = unavailable || links.length === 0;
  $('export-btn').disabled = links.length === 0;
  document.querySelectorAll('.remove').forEach(button => { button.disabled = unavailable; });
}

function setConnection(message, state) {
  $('connection').textContent = message;
  $('connection').dataset.state = state;
}

function render() {
  list.replaceChildren();
  const visible = filterLinks(links, activeCategory, $('search').value);
  $('count').textContent = links.length;
  for (const link of visible) {
    // Build elements instead of injecting saved text into HTML.
    let safeUrl;
    try { safeUrl = normalizeUrl(link.url); } catch { continue; }
    const card = document.createElement('li');
    card.className = 'link-card';
    const top = document.createElement('div');
    top.className = 'card-top';
    const tag = document.createElement('span');
    tag.className = 'category-tag';
    tag.dataset.category = link.category;
    tag.textContent = link.category;
    const arrow = document.createElement('a');
    arrow.className = 'card-arrow';
    arrow.href = safeUrl;
    arrow.target = '_blank';
    arrow.rel = 'noopener noreferrer';
    arrow.textContent = '↗';
    arrow.setAttribute('aria-label', `Open ${link.title} in a new tab`);
    top.append(tag, arrow);
    const title = document.createElement('a');
    title.className = 'card-title';
    title.href = safeUrl;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
    title.textContent = link.title;
    const bottom = document.createElement('div');
    bottom.className = 'card-bottom';
    const domain = document.createElement('span');
    domain.className = 'domain';
    domain.textContent = new URL(safeUrl).hostname.replace(/^www\./, '');
    const removeButton = document.createElement('button');
    removeButton.className = 'remove';
    removeButton.type = 'button';
    removeButton.setAttribute('aria-label', `Remove ${link.title}`);
    removeButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M9 6V3h6v3M7 6l1 15h8l1-15M10 10v7M14 10v7"/></svg>';
    removeButton.addEventListener('click', () => removeLink(link));
    bottom.append(domain, removeButton);
    card.append(top, title, bottom);
    list.append(card);
  }
  $('empty').hidden = visible.length > 0;
  $('empty').querySelector('h3').textContent = links.length ? 'No finds here yet.' : 'A shelf of possibilities.';
  $('empty').querySelector('p').textContent = links.length ? 'Try another collection or a different search.' : 'Add your first find above, or try a few starter links.';
  $('sample-btn').hidden = links.length > 0;
  $('results').textContent = links.length ? `${visible.length} of ${links.length} saved ${links.length === 1 ? 'link' : 'links'}` : 'Ready for your next good find.';
  setControls();
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!connected || !loaded || busy) return;
  $('url-error').textContent = '';
  $('url').removeAttribute('aria-invalid');
  let item;
  try { item = makeLink($('url').value, $('title').value, $('category').value); }
  catch (error) {
    $('url-error').textContent = error.message.startsWith('Invalid URL') ? 'Enter a valid website link.' : error.message;
    $('url').setAttribute('aria-invalid', 'true');
    $('url').focus();
    return;
  }
  if (links.some(link => link.url === item.url)) return notify('That link is already on your shelf.');
  if (links.length >= 200) return notify('Your shelf is full. Remove a link before adding more.');
  busy = true;
  setControls();
  $('save-btn').textContent = 'Saving…';
  try {
    await push(shelfRef, item);
    form.reset();
    activeCategory = 'All';
    $('search').value = '';
    updateFilters();
    render();
    notify('A good find, safely shelved.');
    $('url').focus();
  } catch { notify('Couldn’t save that link. Please check your connection and try again.'); }
  finally { busy = false; $('save-btn').innerHTML = 'Add to my shelf <span aria-hidden="true">+</span>'; setControls(); }
});

async function removeLink(link) {
  if (!connected || busy) return;
  busy = true;
  setControls();
  try {
    await remove(child(shelfRef, link.id));
    // Keep the deleted item briefly recoverable using a normal Undo control.
    clearTimeout(toastTimer);
    $('toast').replaceChildren(document.createTextNode('Link removed. '));
    const undo = document.createElement('button');
    undo.textContent = 'Undo';
    undo.type = 'button';
    undo.className = 'undo';
    undo.addEventListener('click', async () => {
      undo.disabled = true;
      const { id, ...item } = link;
      try { await set(child(shelfRef, id), item); notify('Link restored.'); }
      catch { notify('Couldn’t restore the link. Please try adding it again.'); }
    });
    $('toast').append(undo);
    $('toast').hidden = false;
    toastTimer = setTimeout(() => { $('toast').hidden = true; }, 12000);
  } catch { notify('Couldn’t remove the link. Please try again.'); }
  finally { busy = false; setControls(); }
}

function updateFilters() {
  document.querySelectorAll('.filter').forEach(button => {
    const active = button.dataset.category === activeCategory;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active);
  });
}
document.querySelectorAll('.filter').forEach(button => button.addEventListener('click', () => {
  activeCategory = button.dataset.category;
  updateFilters();
  render();
}));
$('search').addEventListener('input', render);
$('url').addEventListener('input', () => { $('url-error').textContent = ''; $('url').removeAttribute('aria-invalid'); });

$('sample-btn').addEventListener('click', async () => {
  if (!connected || busy) return;
  busy = true;
  setControls();
  const samples = [
    ['https://scrimba.com/learn-javascript-c0v', 'A little JavaScript, every day', 'Learn'],
    ['https://www.blender.org/', 'Build the next Midnight City', 'Make'],
    ['https://ian-rosenthal-crop-library.netlify.app/', 'Notes for a greener kitchen', 'Grow'],
    ['https://developer.mozilla.org/en-US/docs/Web/JavaScript', 'The JavaScript reference shelf', 'Learn'],
  ];
  const batch = {};
  for (const sample of samples) batch[push(shelfRef).key] = makeLink(...sample);
  try { await update(shelfRef, batch); notify('Four starter finds added. Make this shelf yours.'); }
  catch { notify('Couldn’t add starter links. Please try again.'); }
  finally { busy = false; setControls(); }
});

$('clear-btn').addEventListener('click', () => {
  $('confirm-dialog').returnValue = 'cancel';
  $('confirm-dialog').showModal();
});
$('confirm-dialog').addEventListener('close', async () => {
  if ($('confirm-dialog').returnValue !== 'confirm' || !connected || busy) return;
  busy = true;
  setControls();
  try { await remove(shelfRef); notify('Your shelf is clear. Ready for a fresh start.'); }
  catch { notify('Couldn’t clear your shelf. Please try again.'); }
  finally { busy = false; setControls(); }
});

$('export-btn').addEventListener('click', () => {
  const data = { app: 'Pocket Shelf', version: 1, exportedAt: new Date().toISOString(), links: links.map(({ id, ...item }) => item) };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'Pocket-Shelf-Links.json';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify('Your shelf export is ready.');
});

window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event; });
$('install-btn').addEventListener('click', async () => {
  if (installPrompt) { await installPrompt.prompt(); installPrompt = null; }
  else $('install-dialog').showModal();
});

async function start() {
  try {
    const connection = await connectShelf();
    shelfRef = connection.shelfRef;
    onValue(connection.connectionRef, snapshot => {
      connected = snapshot.val() === true;
      setConnection(connected ? 'Connected · your personal shelf' : 'Offline · reconnect to make changes', connected ? 'ready' : 'error');
      setControls();
    });
    onValue(shelfRef, snapshot => {
      // Firebase returns an object keyed by IDs; Object.entries keeps both IDs and values.
      links = snapshotToLinks(snapshot.val());
      loaded = true;
      render();
    }, () => {
      loaded = false;
      setConnection('Your shelf couldn’t load. Please refresh to try again.', 'error');
      setControls();
    });
  } catch (error) {
    console.error('Shelf connection failed:', error.code || error.message);
    setConnection('Couldn’t connect. Check your connection, then refresh.', 'error');
    setControls();
  }
}

render();
start();
if (import.meta.env.PROD && 'serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
