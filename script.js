const STORAGE_KEY = 'local-learning-tool-data-v1';
const APP_NAME = 'local-learning-tool';
const APP_VERSION = 1;
const MIN_INTERVAL_MINUTES = 1;

const NAV_ITEMS = [
  { view: 'deck-overview', label: 'Stapelübersicht' },
  { view: 'add', label: 'Hinzufügen' },
  { view: 'card-management', label: 'Kartenverwaltung' },
  { view: 'learning', label: 'Lernen' },
  { view: 'stats', label: 'Statistiken' },
  { view: 'import-export', label: 'Import / Export' },
];

let appState = {
  app: APP_NAME,
  version: APP_VERSION,
  decks: [],
  cards: [],
};

let currentView = 'deck-overview';
let selectedManagementDeckId = '';
let selectedLearningDeckId = '';
let currentLearningCardId = null;
let isAnswerVisible = false;

const elements = {
  mainNavigation: document.querySelector('#mainNavigation'),
  messageArea: document.querySelector('#messageArea'),
  views: document.querySelectorAll('.view'),
  deckOverviewList: document.querySelector('#deckOverviewList'),
  deckForm: document.querySelector('#deckForm'),
  deckNameInput: document.querySelector('#deckNameInput'),
  quickCardForm: document.querySelector('#quickCardForm'),
  quickCardDeckSelect: document.querySelector('#quickCardDeckSelect'),
  quickQuestionInput: document.querySelector('#quickQuestionInput'),
  quickAnswerInput: document.querySelector('#quickAnswerInput'),
  managementDeckSelect: document.querySelector('#managementDeckSelect'),
  cardEditorForm: document.querySelector('#cardEditorForm'),
  cardEditorTitle: document.querySelector('#cardEditorTitle'),
  editingCardId: document.querySelector('#editingCardId'),
  cardQuestionInput: document.querySelector('#cardQuestionInput'),
  cardAnswerInput: document.querySelector('#cardAnswerInput'),
  cancelCardEditButton: document.querySelector('#cancelCardEditButton'),
  cardManagementList: document.querySelector('#cardManagementList'),
  learningDeckSelect: document.querySelector('#learningDeckSelect'),
  learningCard: document.querySelector('#learningCard'),
  showAnswerButton: document.querySelector('#showAnswerButton'),
  correctButton: document.querySelector('#correctButton'),
  incorrectButton: document.querySelector('#incorrectButton'),
  learningStatus: document.querySelector('#learningStatus'),
  statsGrid: document.querySelector('#statsGrid'),
  exportJsonButton: document.querySelector('#exportJsonButton'),
  importJsonForm: document.querySelector('#importJsonForm'),
  importJsonFile: document.querySelector('#importJsonFile'),
};

initApp();

function initApp() {
  appState = loadData();
  createDemoDataIfEmpty();
  selectedManagementDeckId = appState.decks[0]?.deck_id || '';
  selectedLearningDeckId = appState.decks[0]?.deck_id || '';
  renderNavigation();
  bindEvents();
  showDeckOverview();
}

function bindEvents() {
  elements.deckForm.addEventListener('submit', createDeck);
  elements.quickCardForm.addEventListener('submit', (event) => createCard(event, 'quick'));
  elements.managementDeckSelect.addEventListener('change', () => showCardManagementView(elements.managementDeckSelect.value));
  elements.cardEditorForm.addEventListener('submit', (event) => {
    if (elements.editingCardId.value) updateCard(event, elements.editingCardId.value);
    else createCard(event, 'editor');
  });
  elements.cancelCardEditButton.addEventListener('click', resetCardEditor);
  elements.learningDeckSelect.addEventListener('change', () => startLearning(elements.learningDeckSelect.value));
  elements.showAnswerButton.addEventListener('click', showAnswer);
  elements.correctButton.addEventListener('click', () => gradeCard(currentLearningCardId, 'correct'));
  elements.incorrectButton.addEventListener('click', () => gradeCard(currentLearningCardId, 'incorrect'));
  elements.exportJsonButton.addEventListener('click', exportJson);
  elements.importJsonForm.addEventListener('submit', (event) => {
    event.preventDefault();
    importJson(elements.importJsonFile.files[0]);
  });
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { app: APP_NAME, version: APP_VERSION, decks: [], cards: [] };

  try {
    const parsed = JSON.parse(raw);
    const validation = validateImportData(parsed);
    if (!validation.valid) throw new Error(validation.message);
    return normalizeData(parsed);
  } catch (error) {
    console.error('Lokale Daten sind beschädigt und werden durch Demo-Daten ersetzt.', error);
    showMessage('Kaputte gespeicherte lokale Daten wurden erkannt. Die App startet mit Demo-Daten.', 'error');
    return { app: APP_NAME, version: APP_VERSION, decks: [], cards: [] };
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
}

function createDemoDataIfEmpty() {
  if (appState.decks.length > 0 || appState.cards.length > 0) return;

  const now = new Date().toISOString();
  const deckId = createId('deck');
  appState.decks = [{
    deck_id: deckId,
    deck_name: 'IT-Recht',
    created_at: now,
    updated_at: now,
  }];
  appState.cards = [
    buildCard(deckId, 'Welche „Don’ts“ verbietet der Digital Markets Act?', 'Gatekeeper dürfen eigene Dienste nicht bevorzugen, Nutzer nicht am Deinstallieren hindern und personenbezogene Daten nicht ohne wirksame Zustimmung zusammenführen.'),
    buildCard(deckId, 'Was ist ein Gatekeeper im Sinne des Digital Markets Act?', 'Ein Gatekeeper ist ein großes digitales Plattformunternehmen mit erheblicher Marktmacht, das als wichtiger Zugangspunkt zwischen Unternehmen und Nutzern dient.'),
    buildCard(deckId, 'Was ist das Ziel des Digital Markets Act?', 'Der Digital Markets Act soll faire Wettbewerbsbedingungen auf digitalen Märkten schaffen und die Marktmacht großer Plattformen begrenzen.'),
  ];
  saveData();
}

function buildCard(deckId, question, answer) {
  const now = new Date().toISOString();
  return {
    card_id: createId('card'),
    deck_id: deckId,
    question,
    answer,
    created_at: now,
    updated_at: now,
    due_at: now,
    interval_minutes: 0,
    correct_count: 0,
    incorrect_count: 0,
    last_reviewed_at: null,
    review_history: [],
  };
}

function normalizeData(data) {
  return {
    app: data.app || APP_NAME,
    version: Number(data.version || APP_VERSION),
    decks: data.decks.map((deck) => ({
      deck_id: String(deck.deck_id),
      deck_name: String(deck.deck_name).trim(),
      created_at: deck.created_at || new Date().toISOString(),
      updated_at: deck.updated_at || deck.created_at || new Date().toISOString(),
    })),
    cards: data.cards.map((card) => ({
      card_id: String(card.card_id),
      deck_id: String(card.deck_id),
      question: String(card.question).trim(),
      answer: String(card.answer).trim(),
      created_at: card.created_at || new Date().toISOString(),
      updated_at: card.updated_at || card.created_at || new Date().toISOString(),
      due_at: card.due_at || new Date().toISOString(),
      interval_minutes: Math.max(0, Number(card.interval_minutes || 0)),
      correct_count: Math.max(0, Number(card.correct_count || 0)),
      incorrect_count: Math.max(0, Number(card.incorrect_count || 0)),
      last_reviewed_at: card.last_reviewed_at || null,
      review_history: Array.isArray(card.review_history) ? card.review_history.map(normalizeReviewEntry) : [],
    })),
  };
}

function normalizeReviewEntry(entry) {
  return {
    reviewed_at: entry.reviewed_at || new Date().toISOString(),
    result: entry.result === 'incorrect' ? 'incorrect' : 'correct',
    old_interval_minutes: Math.max(0, Number(entry.old_interval_minutes || 0)),
    new_interval_minutes: Math.max(MIN_INTERVAL_MINUTES, Number(entry.new_interval_minutes || MIN_INTERVAL_MINUTES)),
    next_due_at: entry.next_due_at || new Date().toISOString(),
  };
}

function renderNavigation() {
  elements.mainNavigation.innerHTML = NAV_ITEMS.map((item) => (
    `<button type="button" class="nav-button" data-view-target="${item.view}">${item.label}</button>`
  )).join('');

  elements.mainNavigation.querySelectorAll('[data-view-target]').forEach((button) => {
    button.addEventListener('click', () => showView(button.dataset.viewTarget));
  });
}

function showView(viewName) {
  currentView = viewName;
  elements.views.forEach((view) => view.classList.toggle('active', view.dataset.view === viewName));
  elements.mainNavigation.querySelectorAll('.nav-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.viewTarget === viewName);
  });

  if (viewName === 'deck-overview') showDeckOverview(false);
  if (viewName === 'add') showAddView(false);
  if (viewName === 'card-management') showCardManagementView(selectedManagementDeckId, false);
  if (viewName === 'learning') showLearningView(selectedLearningDeckId, false);
  if (viewName === 'stats') showStatsView(false);
  if (viewName === 'import-export') showImportExportView(false);
}

function showDeckOverview(switchView = true) {
  if (switchView) showView('deck-overview');
  renderDeckOverview();
}

function showAddView(switchView = true) {
  if (switchView) showView('add');
  renderDeckSelects();
}

function showCardManagementView(deckId = selectedManagementDeckId, switchView = true) {
  selectedManagementDeckId = deckId || appState.decks[0]?.deck_id || '';
  if (switchView) showView('card-management');
  renderDeckSelects();
  elements.managementDeckSelect.value = selectedManagementDeckId;
  renderCardManagement();
}

function showLearningView(deckId = selectedLearningDeckId, switchView = true) {
  selectedLearningDeckId = deckId || appState.decks[0]?.deck_id || '';
  if (switchView) showView('learning');
  renderDeckSelects();
  elements.learningDeckSelect.value = selectedLearningDeckId;
  showCurrentCard();
}

function showStatsView(switchView = true) {
  if (switchView) showView('stats');
  renderStats();
}

function showImportExportView(switchView = true) {
  if (switchView) showView('import-export');
}

function renderDeckOverview() {
  if (appState.decks.length === 0) {
    elements.deckOverviewList.innerHTML = '<article class="deck-card empty">Noch keine Stapel vorhanden. Erstelle deinen ersten Stapel.</article>';
    return;
  }

  elements.deckOverviewList.innerHTML = appState.decks.map((deck) => {
    const stats = getDeckStats(deck.deck_id);
    return `<article class="deck-card">
      <h2>${escapeHtml(deck.deck_name)}</h2>
      <div class="deck-stats">
        <span><strong>${stats.newCards}</strong>Neue Karten</span>
        <span><strong>${stats.dueCards}</strong>Fällig</span>
        <span><strong>${stats.learnedCards}</strong>Gelernt</span>
      </div>
      <div class="deck-actions">
        <button type="button" data-start-learning="${deck.deck_id}">Lernen starten</button>
        <button type="button" class="secondary" data-manage-deck="${deck.deck_id}">Karten verwalten</button>
        <button type="button" class="danger" data-delete-deck="${deck.deck_id}">Stapel löschen</button>
      </div>
    </article>`;
  }).join('');

  elements.deckOverviewList.querySelectorAll('[data-start-learning]').forEach((button) => {
    button.addEventListener('click', () => startLearning(button.dataset.startLearning));
  });
  elements.deckOverviewList.querySelectorAll('[data-manage-deck]').forEach((button) => {
    button.addEventListener('click', () => showCardManagementView(button.dataset.manageDeck));
  });
  elements.deckOverviewList.querySelectorAll('[data-delete-deck]').forEach((button) => {
    button.addEventListener('click', () => deleteDeck(button.dataset.deleteDeck));
  });
}

function renderDeckSelects() {
  const options = appState.decks.map((deck) => `<option value="${deck.deck_id}">${escapeHtml(deck.deck_name)}</option>`).join('');
  const placeholder = '<option value="">Kein Stapel vorhanden</option>';
  [elements.quickCardDeckSelect, elements.managementDeckSelect, elements.learningDeckSelect].forEach((select) => {
    select.innerHTML = options || placeholder;
    select.disabled = appState.decks.length === 0;
  });
  if (selectedManagementDeckId) elements.managementDeckSelect.value = selectedManagementDeckId;
  if (selectedLearningDeckId) elements.learningDeckSelect.value = selectedLearningDeckId;
}

function renderCardManagement() {
  const deck = getDeck(selectedManagementDeckId);
  resetCardEditor(false);

  if (!deck) {
    elements.cardManagementList.innerHTML = '<article class="card-item">Noch keine Stapel vorhanden. Erstelle zuerst einen Stapel.</article>';
    elements.cardEditorForm.querySelector('button[type="submit"]').disabled = true;
    return;
  }

  elements.cardEditorForm.querySelector('button[type="submit"]').disabled = false;
  const cards = getCardsForDeck(deck.deck_id);
  if (cards.length === 0) {
    elements.cardManagementList.innerHTML = '<article class="card-item">Dieser Stapel enthält noch keine Karten.</article>';
    return;
  }

  elements.cardManagementList.innerHTML = cards.map((card) => `<article class="card-item">
    <header><strong>${escapeHtml(deck.deck_name)}</strong><span>Intervall: ${card.interval_minutes} Min.</span></header>
    <p><strong>Frage:</strong> ${escapeHtml(card.question)}</p>
    <p><strong>Antwort:</strong> ${escapeHtml(card.answer)}</p>
    <p class="card-meta">Fällig: ${formatDateTime(card.due_at)} · Richtig: ${card.correct_count} · Falsch: ${card.incorrect_count}</p>
    <div class="button-row">
      <button type="button" class="secondary" data-edit-card="${card.card_id}">Bearbeiten</button>
      <button type="button" class="danger" data-delete-card="${card.card_id}">Karte löschen</button>
    </div>
  </article>`).join('');

  elements.cardManagementList.querySelectorAll('[data-edit-card]').forEach((button) => {
    button.addEventListener('click', () => editCard(button.dataset.editCard));
  });
  elements.cardManagementList.querySelectorAll('[data-delete-card]').forEach((button) => {
    button.addEventListener('click', () => deleteCard(button.dataset.deleteCard));
  });
}

function renderStats() {
  const stats = getGlobalStats();
  const items = [
    ['Anzahl aller Stapel', stats.deckCount],
    ['Anzahl aller Karten', stats.cardCount],
    ['Anzahl neuer Karten', stats.newCards],
    ['Anzahl fälliger Karten', stats.dueCards],
    ['Heute gelernte Karten', stats.reviewedToday],
    ['Richtige Antworten', stats.correctAnswers],
    ['Falsche Antworten', stats.incorrectAnswers],
    ['Trefferquote', `${stats.hitRate} %`],
  ];

  elements.statsGrid.innerHTML = items.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

function createDeck(event) {
  event.preventDefault();
  const deckName = elements.deckNameInput.value.trim();
  if (!deckName) {
    showMessage('Leerer Stapelname ist nicht erlaubt.', 'error');
    return;
  }
  if (appState.decks.some((deck) => deck.deck_name.toLowerCase() === deckName.toLowerCase())) {
    showMessage('Doppelte Stapelnamen sind nicht erlaubt.', 'error');
    return;
  }

  const now = new Date().toISOString();
  const deck = { deck_id: createId('deck'), deck_name: deckName, created_at: now, updated_at: now };
  appState.decks.push(deck);
  selectedManagementDeckId = deck.deck_id;
  selectedLearningDeckId = deck.deck_id;
  elements.deckNameInput.value = '';
  saveData();
  refreshCurrentView();
  showMessage(`Stapel „${deckName}“ wurde erstellt.`, 'success');
}

function deleteDeck(deckId) {
  const deck = getDeck(deckId);
  if (!deck) return;
  const cardCount = getCardsForDeck(deckId).length;
  if (!confirm(`Stapel „${deck.deck_name}“ mit ${cardCount} Karte(n) wirklich löschen?`)) return;

  appState.decks = appState.decks.filter((item) => item.deck_id !== deckId);
  appState.cards = appState.cards.filter((card) => card.deck_id !== deckId);
  if (selectedManagementDeckId === deckId) selectedManagementDeckId = appState.decks[0]?.deck_id || '';
  if (selectedLearningDeckId === deckId) selectedLearningDeckId = appState.decks[0]?.deck_id || '';
  if (currentLearningCardId && !getCard(currentLearningCardId)) currentLearningCardId = null;
  saveData();
  refreshCurrentView();
  showMessage(`Stapel „${deck.deck_name}“ wurde gelöscht.`, 'success');
}

function createCard(event, source) {
  event.preventDefault();
  const deckId = source === 'quick' ? elements.quickCardDeckSelect.value : selectedManagementDeckId;
  const questionInput = source === 'quick' ? elements.quickQuestionInput : elements.cardQuestionInput;
  const answerInput = source === 'quick' ? elements.quickAnswerInput : elements.cardAnswerInput;
  const question = questionInput.value.trim();
  const answer = answerInput.value.trim();

  if (!deckId) {
    showMessage('Erstelle zuerst einen Stapel.', 'error');
    return;
  }
  if (!question) {
    showMessage('Leere Frage ist nicht erlaubt.', 'error');
    return;
  }
  if (!answer) {
    showMessage('Leere Antwort ist nicht erlaubt.', 'error');
    return;
  }

  appState.cards.push(buildCard(deckId, question, answer));
  questionInput.value = '';
  answerInput.value = '';
  selectedManagementDeckId = deckId;
  selectedLearningDeckId = deckId;
  saveData();
  refreshCurrentView();
  showMessage('Karte wurde erstellt.', 'success');
}

function editCard(cardId) {
  const card = getCard(cardId);
  if (!card) return;
  elements.editingCardId.value = card.card_id;
  elements.cardQuestionInput.value = card.question;
  elements.cardAnswerInput.value = card.answer;
  elements.cardEditorTitle.textContent = 'Karte bearbeiten';
  elements.cancelCardEditButton.classList.remove('hidden');
  elements.cardQuestionInput.focus();
}

function updateCard(event, cardId) {
  event.preventDefault();
  const card = getCard(cardId);
  if (!card) return;
  const question = elements.cardQuestionInput.value.trim();
  const answer = elements.cardAnswerInput.value.trim();
  if (!question) {
    showMessage('Leere Frage ist nicht erlaubt.', 'error');
    return;
  }
  if (!answer) {
    showMessage('Leere Antwort ist nicht erlaubt.', 'error');
    return;
  }

  card.question = question;
  card.answer = answer;
  card.updated_at = new Date().toISOString();
  saveData();
  resetCardEditor();
  renderCardManagement();
  showMessage('Karte wurde aktualisiert.', 'success');
}

function deleteCard(cardId) {
  const card = getCard(cardId);
  if (!card) return;
  if (!confirm('Karte wirklich löschen?')) return;
  appState.cards = appState.cards.filter((item) => item.card_id !== cardId);
  if (currentLearningCardId === cardId) currentLearningCardId = null;
  saveData();
  refreshCurrentView();
  showMessage('Karte wurde gelöscht.', 'success');
}

function resetCardEditor(clearMessage = true) {
  elements.editingCardId.value = '';
  elements.cardQuestionInput.value = '';
  elements.cardAnswerInput.value = '';
  elements.cardEditorTitle.textContent = 'Karte erstellen';
  elements.cancelCardEditButton.classList.add('hidden');
  if (clearMessage) clearMessageArea();
}

function getDueCards(deckId) {
  const now = Date.now();
  return getCardsForDeck(deckId)
    .filter((card) => new Date(card.due_at).getTime() <= now)
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
}

function startLearning(deckId) {
  selectedLearningDeckId = deckId;
  currentLearningCardId = null;
  isAnswerVisible = false;
  showLearningView(deckId);
}

function showCurrentCard() {
  const deck = getDeck(selectedLearningDeckId);
  isAnswerVisible = false;
  elements.correctButton.classList.add('hidden');
  elements.incorrectButton.classList.add('hidden');

  if (!deck) {
    currentLearningCardId = null;
    elements.learningCard.innerHTML = '<p class="muted">Noch keine Stapel vorhanden.</p>';
    elements.learningStatus.textContent = '';
    elements.showAnswerButton.disabled = true;
    return;
  }

  const allDeckCards = getCardsForDeck(deck.deck_id);
  if (allDeckCards.length === 0) {
    currentLearningCardId = null;
    elements.learningCard.innerHTML = '<p class="muted">Dieser Stapel enthält noch keine Karten.</p>';
    elements.learningStatus.textContent = '';
    elements.showAnswerButton.disabled = true;
    return;
  }

  const dueCards = getDueCards(deck.deck_id);
  if (dueCards.length === 0) {
    currentLearningCardId = null;
    const nextDue = getNextDueCard(deck.deck_id);
    elements.learningCard.innerHTML = '<p class="muted">Keine Karten fällig.</p>';
    elements.learningStatus.textContent = nextDue ? `Nächste Karte fällig um: ${formatDateTime(nextDue.due_at)}` : '';
    elements.showAnswerButton.disabled = true;
    return;
  }

  currentLearningCardId = dueCards[0].card_id;
  renderLearningQuestion(dueCards[0], deck);
}

function renderLearningQuestion(card, deck) {
  elements.learningCard.innerHTML = `<div>
    <span class="card-side-label">${escapeHtml(deck.deck_name)} · Frage</span>
    <div class="card-text">${escapeHtml(card.question)}</div>
  </div>`;
  elements.learningStatus.textContent = `${getDueCards(deck.deck_id).length} Karte(n) fällig.`;
  elements.showAnswerButton.disabled = false;
}

function showAnswer() {
  const card = getCard(currentLearningCardId);
  const deck = card ? getDeck(card.deck_id) : null;
  if (!card || !deck) return;
  isAnswerVisible = true;
  elements.learningCard.innerHTML = `<div>
    <span class="card-side-label">${escapeHtml(deck.deck_name)} · Antwort</span>
    <div class="card-text">${escapeHtml(card.answer)}</div>
  </div>`;
  elements.showAnswerButton.disabled = true;
  elements.correctButton.classList.remove('hidden');
  elements.incorrectButton.classList.remove('hidden');
}

function gradeCard(cardId, result) {
  const card = getCard(cardId);
  if (!card || !isAnswerVisible) return;
  const oldInterval = Math.max(0, Number(card.interval_minutes || 0));
  const newInterval = calculateNextInterval(oldInterval, result);
  const reviewedAt = new Date().toISOString();
  const nextDueAt = calculateNextDueAt(newInterval);

  card.interval_minutes = newInterval;
  card.due_at = nextDueAt;
  card.updated_at = reviewedAt;
  card.last_reviewed_at = reviewedAt;
  if (result === 'correct') card.correct_count += 1;
  else card.incorrect_count += 1;
  card.review_history.push({
    reviewed_at: reviewedAt,
    result,
    old_interval_minutes: oldInterval,
    new_interval_minutes: newInterval,
    next_due_at: nextDueAt,
  });

  saveData();
  currentLearningCardId = null;
  isAnswerVisible = false;
  showCurrentCard();
}

function calculateNextInterval(oldInterval, result) {
  if (result === 'correct') return oldInterval + 1;
  return Math.max(MIN_INTERVAL_MINUTES, oldInterval - 2);
}

function calculateNextDueAt(intervalMinutes) {
  return new Date(Date.now() + intervalMinutes * 60 * 1000).toISOString();
}

function exportJson() {
  const exportData = {
    app: APP_NAME,
    version: APP_VERSION,
    exported_at: new Date().toISOString(),
    decks: appState.decks,
    cards: appState.cards,
  };
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'learning-tool-backup.json';
  link.click();
  URL.revokeObjectURL(url);
  showMessage('JSON Export wurde erstellt.', 'success');
}

async function importJson(file) {
  if (!file) {
    showMessage('Bitte wähle eine JSON-Datei aus.', 'error');
    return;
  }

  try {
    const parsed = JSON.parse(await file.text());
    const validation = validateImportData(parsed);
    if (!validation.valid) {
      showMessage(`Import ungültig: ${validation.message}`, 'error');
      return;
    }
    if (!confirm('Lokale Daten wirklich durch importierte Daten ersetzen?')) {
      showMessage('Import wurde abgebrochen. Lokale Daten bleiben unverändert.', 'info');
      return;
    }
    replaceLocalData(parsed);
    elements.importJsonForm.reset();
    showMessage('JSON Import erfolgreich. Lokale Daten wurden ersetzt.', 'success');
  } catch (error) {
    showMessage(`Import ungültig: ${error.message}`, 'error');
  }
}

function validateImportData(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { valid: false, message: 'Root muss ein Objekt sein.' };
  if (!Array.isArray(data.decks)) return { valid: false, message: 'decks muss ein Array sein.' };
  if (!Array.isArray(data.cards)) return { valid: false, message: 'cards muss ein Array sein.' };

  for (const [index, deck] of data.decks.entries()) {
    if (!deck || typeof deck !== 'object') return { valid: false, message: `Deck ${index + 1} ist kein Objekt.` };
    if (!String(deck.deck_id || '').trim()) return { valid: false, message: `Deck ${index + 1} hat keine deck_id.` };
    if (!String(deck.deck_name || '').trim()) return { valid: false, message: `Deck ${index + 1} hat keinen deck_name.` };
  }

  for (const [index, card] of data.cards.entries()) {
    if (!card || typeof card !== 'object') return { valid: false, message: `Karte ${index + 1} ist kein Objekt.` };
    if (!String(card.card_id || '').trim()) return { valid: false, message: `Karte ${index + 1} hat keine card_id.` };
    if (!String(card.deck_id || '').trim()) return { valid: false, message: `Karte ${index + 1} hat keine deck_id.` };
    if (!String(card.question || '').trim()) return { valid: false, message: `Karte ${index + 1} hat keine Frage.` };
    if (!String(card.answer || '').trim()) return { valid: false, message: `Karte ${index + 1} hat keine Antwort.` };
  }

  return { valid: true, message: 'OK' };
}

function replaceLocalData(data) {
  appState = normalizeData(data);
  saveData();
  selectedManagementDeckId = appState.decks[0]?.deck_id || '';
  selectedLearningDeckId = appState.decks[0]?.deck_id || '';
  currentLearningCardId = null;
  isAnswerVisible = false;
  refreshCurrentView();
}

function getDeck(deckId) {
  return appState.decks.find((deck) => deck.deck_id === deckId);
}

function getCard(cardId) {
  return appState.cards.find((card) => card.card_id === cardId);
}

function getCardsForDeck(deckId) {
  return appState.cards.filter((card) => card.deck_id === deckId);
}

function getNextDueCard(deckId) {
  return getCardsForDeck(deckId)
    .slice()
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())[0];
}

function getDeckStats(deckId) {
  const cards = getCardsForDeck(deckId);
  const now = Date.now();
  return {
    newCards: cards.filter((card) => card.last_reviewed_at === null).length,
    dueCards: cards.filter((card) => new Date(card.due_at).getTime() <= now).length,
    learnedCards: cards.filter((card) => card.last_reviewed_at !== null).length,
  };
}

function getGlobalStats() {
  const allReviewEntries = appState.cards.flatMap((card) => card.review_history || []);
  const todayKey = new Date().toISOString().slice(0, 10);
  const correctAnswers = allReviewEntries.filter((entry) => entry.result === 'correct').length;
  const incorrectAnswers = allReviewEntries.filter((entry) => entry.result === 'incorrect').length;
  const totalAnswers = correctAnswers + incorrectAnswers;

  return {
    deckCount: appState.decks.length,
    cardCount: appState.cards.length,
    newCards: appState.cards.filter((card) => card.last_reviewed_at === null).length,
    dueCards: appState.cards.filter((card) => new Date(card.due_at).getTime() <= Date.now()).length,
    reviewedToday: allReviewEntries.filter((entry) => String(entry.reviewed_at).slice(0, 10) === todayKey).length,
    correctAnswers,
    incorrectAnswers,
    hitRate: totalAnswers === 0 ? 0 : Math.round((correctAnswers / totalAnswers) * 100),
  };
}

function refreshCurrentView() {
  renderDeckSelects();
  if (currentView === 'deck-overview') renderDeckOverview();
  if (currentView === 'add') showAddView(false);
  if (currentView === 'card-management') showCardManagementView(selectedManagementDeckId, false);
  if (currentView === 'learning') showLearningView(selectedLearningDeckId, false);
  if (currentView === 'stats') renderStats();
}

function showMessage(text, type = 'info') {
  elements.messageArea.innerHTML = `<div class="message ${type}">${escapeHtml(text)}</div>`;
}

function clearMessageArea() {
  elements.messageArea.innerHTML = '';
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat('de-DE', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  }[char]));
}
