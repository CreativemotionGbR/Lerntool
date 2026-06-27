const STORAGE_KEY = 'lerntool:data:v1';
const GITHUB_SETTINGS_KEY = 'lerntool:github:settings:v1';
const GITHUB_TOKEN_KEY = 'lerntool:github:token:v1';
const DEFAULT_GITHUB_PATH = 'learning-tool-data/data.json';

const state = loadData();
let currentReviewCardId = null;
let showingAnswer = false;
let lastDownloadedData = null;

const elements = {
  cardForm: document.querySelector('#cardForm'),
  deckInput: document.querySelector('#deckInput'),
  frontInput: document.querySelector('#frontInput'),
  backInput: document.querySelector('#backInput'),
  deckFilter: document.querySelector('#deckFilter'),
  reviewCard: document.querySelector('#reviewCard'),
  showAnswerButton: document.querySelector('#showAnswerButton'),
  knownButton: document.querySelector('#knownButton'),
  unknownButton: document.querySelector('#unknownButton'),
  cardList: document.querySelector('#cardList'),
  cardCount: document.querySelector('#cardCount'),
  exportButton: document.querySelector('#exportButton'),
  githubSettingsForm: document.querySelector('#githubSettingsForm'),
  githubOwner: document.querySelector('#githubOwner'),
  githubRepo: document.querySelector('#githubRepo'),
  githubBranch: document.querySelector('#githubBranch'),
  githubPath: document.querySelector('#githubPath'),
  githubToken: document.querySelector('#githubToken'),
  persistToken: document.querySelector('#persistToken'),
  tokenWarning: document.querySelector('#tokenWarning'),
  uploadGithubButton: document.querySelector('#uploadGithubButton'),
  downloadGithubButton: document.querySelector('#downloadGithubButton'),
  replaceLocalButton: document.querySelector('#replaceLocalButton'),
  syncLog: document.querySelector('#syncLog'),
};

init();

function init() {
  loadGithubSettingsIntoForm();
  bindEvents();
  render();
}

function bindEvents() {
  elements.cardForm.addEventListener('submit', addCard);
  elements.deckFilter.addEventListener('change', pickReviewCard);
  elements.showAnswerButton.addEventListener('click', () => { showingAnswer = true; renderReview(); });
  elements.knownButton.addEventListener('click', () => reviewCurrentCard(true));
  elements.unknownButton.addEventListener('click', () => reviewCurrentCard(false));
  elements.exportButton.addEventListener('click', exportJson);
  elements.githubSettingsForm.addEventListener('submit', saveGithubSettings);
  elements.persistToken.addEventListener('change', updateTokenWarning);
  elements.uploadGithubButton.addEventListener('click', uploadToGithub);
  elements.downloadGithubButton.addEventListener('click', downloadFromGithub);
  elements.replaceLocalButton.addEventListener('click', replaceLocalWithGithubData);
}

function createEmptyData() {
  return { version: 1, decks: [], cards: [], reviews: [], updatedAt: new Date().toISOString() };
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeData(JSON.parse(raw)) : createEmptyData();
  } catch (error) {
    console.error(error);
    return createEmptyData();
  }
}

function normalizeData(data) {
  return {
    version: 1,
    decks: Array.isArray(data.decks) ? data.decks : [],
    cards: Array.isArray(data.cards) ? data.cards : [],
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

function persistData() {
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function addCard(event) {
  event.preventDefault();
  const deckName = elements.deckInput.value.trim();
  const front = elements.frontInput.value.trim();
  const back = elements.backInput.value.trim();
  if (!deckName || !front || !back) return;

  let deck = state.decks.find((item) => item.name.toLowerCase() === deckName.toLowerCase());
  if (!deck) {
    deck = { id: crypto.randomUUID(), name: deckName, createdAt: new Date().toISOString() };
    state.decks.push(deck);
  }

  state.cards.push({ id: crypto.randomUUID(), deckId: deck.id, front, back, createdAt: new Date().toISOString(), knownCount: 0, unknownCount: 0 });
  elements.cardForm.reset();
  persistData();
  render();
}

function render() {
  renderDeckFilter();
  renderList();
  pickReviewCard(false);
  elements.cardCount.textContent = `${state.cards.length} ${state.cards.length === 1 ? 'Karte' : 'Karten'}`;
}

function renderDeckFilter() {
  const selected = elements.deckFilter.value;
  const options = ['<option value="all">Alle Stapel</option>'].concat(state.decks.map((deck) => `<option value="${deck.id}">${escapeHtml(deck.name)}</option>`));
  elements.deckFilter.innerHTML = options.join('');
  if ([...elements.deckFilter.options].some((option) => option.value === selected)) elements.deckFilter.value = selected;
}

function pickReviewCard(resetAnswer = true) {
  const cards = filteredCards();
  currentReviewCardId = cards.length ? cards[Math.floor(Math.random() * cards.length)].id : null;
  if (resetAnswer) showingAnswer = false;
  renderReview();
}

function filteredCards() {
  const deckId = elements.deckFilter.value;
  return deckId === 'all' ? state.cards : state.cards.filter((card) => card.deckId === deckId);
}

function renderReview() {
  const card = state.cards.find((item) => item.id === currentReviewCardId);
  const hasCard = Boolean(card);
  elements.showAnswerButton.disabled = !hasCard;
  elements.knownButton.disabled = !hasCard || !showingAnswer;
  elements.unknownButton.disabled = !hasCard || !showingAnswer;
  if (!card) {
    elements.reviewCard.className = 'flashcard empty';
    elements.reviewCard.textContent = 'Keine Karte für diese Auswahl vorhanden.';
    return;
  }
  elements.reviewCard.className = 'flashcard';
  elements.reviewCard.innerHTML = `<div><strong>${showingAnswer ? 'Antwort' : 'Frage'}</strong><p>${escapeHtml(showingAnswer ? card.back : card.front)}</p></div>`;
}

function reviewCurrentCard(known) {
  const card = state.cards.find((item) => item.id === currentReviewCardId);
  if (!card) return;
  if (known) card.knownCount += 1; else card.unknownCount += 1;
  state.reviews.push({ cardId: card.id, known, reviewedAt: new Date().toISOString() });
  persistData();
  showingAnswer = false;
  render();
}

function renderList() {
  if (!state.cards.length) {
    elements.cardList.innerHTML = '<p class="muted">Noch keine Lernkarten vorhanden.</p>';
    return;
  }
  elements.cardList.innerHTML = state.cards.map((card) => {
    const deck = state.decks.find((item) => item.id === card.deckId);
    return `<article class="card-item">
      <header><strong>${escapeHtml(deck?.name || 'Ohne Stapel')}</strong><button type="button" data-delete="${card.id}" class="danger">Löschen</button></header>
      <p><strong>Frage:</strong> ${escapeHtml(card.front)}</p>
      <p><strong>Antwort:</strong> ${escapeHtml(card.back)}</p>
      <small>Gewusst: ${card.knownCount || 0} · Nicht gewusst: ${card.unknownCount || 0}</small>
    </article>`;
  }).join('');
  elements.cardList.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', deleteCard));
}

function deleteCard(event) {
  const id = event.currentTarget.dataset.delete;
  const index = state.cards.findIndex((card) => card.id === id);
  if (index >= 0 && confirm('Diese Karte wirklich löschen?')) {
    state.cards.splice(index, 1);
    state.reviews = state.reviews.filter((review) => review.cardId !== id);
    persistData();
    render();
  }
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'lerntool-data.json';
  link.click();
  URL.revokeObjectURL(url);
}

function loadGithubSettingsIntoForm() {
  const settings = JSON.parse(localStorage.getItem(GITHUB_SETTINGS_KEY) || '{}');
  elements.githubOwner.value = settings.owner || '';
  elements.githubRepo.value = settings.repo || '';
  elements.githubBranch.value = settings.branch || 'main';
  elements.githubPath.value = settings.path || DEFAULT_GITHUB_PATH;
  const persistentToken = localStorage.getItem(GITHUB_TOKEN_KEY);
  const sessionToken = sessionStorage.getItem(GITHUB_TOKEN_KEY);
  elements.githubToken.value = persistentToken || sessionToken || '';
  elements.persistToken.checked = Boolean(persistentToken);
  updateTokenWarning();
}

function getGithubConfig() {
  return {
    owner: elements.githubOwner.value.trim(),
    repo: elements.githubRepo.value.trim(),
    branch: elements.githubBranch.value.trim() || 'main',
    path: elements.githubPath.value.trim() || DEFAULT_GITHUB_PATH,
    token: elements.githubToken.value.trim(),
  };
}

function saveGithubSettings(event) {
  event.preventDefault();
  const { owner, repo, branch, path, token } = getGithubConfig();
  localStorage.setItem(GITHUB_SETTINGS_KEY, JSON.stringify({ owner, repo, branch, path }));
  localStorage.removeItem(GITHUB_TOKEN_KEY);
  sessionStorage.removeItem(GITHUB_TOKEN_KEY);
  if (token) {
    const storage = elements.persistToken.checked ? localStorage : sessionStorage;
    storage.setItem(GITHUB_TOKEN_KEY, token);
  }
  updateTokenWarning();
  logSync('GitHub-Einstellungen gespeichert.');
}

function updateTokenWarning() {
  elements.tokenWarning.classList.toggle('hidden', !elements.persistToken.checked);
}

async function uploadToGithub() {
  try {
    const config = requireGithubConfig();
    const existing = await fetchGithubFile(config, false);
    const body = {
      message: `Update learning data ${new Date().toISOString()}`,
      content: toBase64Unicode(JSON.stringify(state, null, 2)),
      branch: config.branch,
    };
    if (existing?.sha) body.sha = existing.sha;
    await githubRequest(config, 'PUT', fileApiUrl(config), body);
    logSync(`Upload erfolgreich: ${config.path}`);
  } catch (error) {
    logSync(`Upload fehlgeschlagen: ${error.message}`);
  }
}

async function downloadFromGithub() {
  try {
    const config = requireGithubConfig();
    const file = await fetchGithubFile(config, true);
    lastDownloadedData = normalizeData(JSON.parse(fromBase64Unicode(file.content)));
    logSync(`Download erfolgreich. Enthält ${lastDownloadedData.cards.length} Karten. Nutze „Lokale Daten mit GitHub-Daten ersetzen“, um sie zu übernehmen.`);
  } catch (error) {
    logSync(`Download fehlgeschlagen: ${error.message}`);
  }
}

async function replaceLocalWithGithubData() {
  if (!lastDownloadedData) {
    await downloadFromGithub();
  }
  if (!lastDownloadedData) return;
  if (!confirm('Lokale Daten wirklich vollständig durch die zuletzt von GitHub geladenen Daten ersetzen?')) return;
  Object.assign(state, normalizeData(lastDownloadedData));
  persistData();
  render();
  logSync('Lokale Daten wurden mit den GitHub-Daten ersetzt.');
}

function requireGithubConfig() {
  const config = getGithubConfig();
  if (!config.owner || !config.repo || !config.token) throw new Error('Repository-Besitzer, Repository-Name und Token sind erforderlich.');
  return config;
}

function fileApiUrl({ owner, repo, path }) {
  return `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${path.split('/').map(encodeURIComponent).join('/')}`;
}

async function fetchGithubFile(config, required) {
  const response = await fetch(`${fileApiUrl(config)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token),
  });
  if (response.status === 404 && !required) return null;
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json();
}

async function githubRequest(config, method, url, body) {
  const response = await fetch(url, { method, headers: githubHeaders(config.token), body: JSON.stringify(body) });
  if (!response.ok) throw new Error(await errorMessage(response));
  return response.json();
}

function githubHeaders(token) {
  return { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' };
}

async function errorMessage(response) {
  try { return (await response.json()).message || response.statusText; } catch { return response.statusText; }
}

function toBase64Unicode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function fromBase64Unicode(text) {
  const binary = atob(text.replace(/\n/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}

function logSync(message) {
  elements.syncLog.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
