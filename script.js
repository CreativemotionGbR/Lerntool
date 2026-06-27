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
let selectedApkgFile = null;
let lastApkgImportSummary = null;

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
  apkgImportForm: document.querySelector('#apkgImportForm'),
  apkgFileInput: document.querySelector('#apkgFileInput'),
  importApkgButton: document.querySelector('#importApkgButton'),
  selectedApkgFileName: document.querySelector('#selectedApkgFileName'),
  apkgStatus: document.querySelector('#apkgStatus'),
  apkgPreview: document.querySelector('#apkgPreview'),
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
  elements.apkgImportForm.addEventListener('submit', (event) => {
    event.preventDefault();
    importSelectedApkg();
  });
  elements.apkgFileInput.addEventListener('change', () => handleApkgFileSelected(elements.apkgFileInput.files[0]));
  elements.importApkgButton.addEventListener('click', importSelectedApkg);
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
      source_type: card.source_type || null,
      source_note_id: card.source_note_id || null,
      source_card_id: card.source_card_id || null,
      imported_at: card.imported_at || null,
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
  if (!selectedApkgFile) resetApkgImportUi();
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


function resetApkgImportUi() {
  selectedApkgFile = null;
  lastApkgImportSummary = null;
  elements.apkgFileInput.value = '';
  elements.importApkgButton.disabled = true;
  elements.selectedApkgFileName.textContent = 'Ausgewählte Datei: keine';
  elements.apkgStatus.textContent = 'Noch keine Datei ausgewählt.';
  elements.apkgPreview.innerHTML = '';
}

function handleApkgFileSelected(file) {
  selectedApkgFile = file || null;
  lastApkgImportSummary = null;
  elements.apkgPreview.innerHTML = '';
  if (!file) {
    elements.importApkgButton.disabled = true;
    elements.selectedApkgFileName.textContent = 'Ausgewählte Datei: keine';
    elements.apkgStatus.textContent = 'Noch keine Datei ausgewählt.';
    return;
  }
  elements.importApkgButton.disabled = false;
  elements.selectedApkgFileName.textContent = `Ausgewählte Datei: ${file.name}`;
  elements.apkgStatus.textContent = `Datei ausgewählt: ${file.name}`;
}

async function importSelectedApkg() {
  if (!selectedApkgFile) {
    elements.apkgStatus.textContent = 'Import fehlgeschlagen: keine Datei ausgewählt.';
    return;
  }
  try {
    elements.importApkgButton.disabled = true;
    elements.apkgStatus.textContent = 'Import läuft...';
    elements.apkgPreview.innerHTML = '';
    const analysis = await analyzeApkgFile(selectedApkgFile);
    const summary = saveImportedAnkiCards(analysis);
    lastApkgImportSummary = { analysis, summary };
    renderApkgImportSummary(summary, analysis);
    elements.apkgStatus.textContent = `Import erfolgreich: ${summary.importedCount} Karten importiert, ${summary.duplicateCount} Duplikate übersprungen.`;
    showMessage(`${summary.importedCount} Anki-Karte(n) wurden importiert.`, 'success');
  } catch (error) {
    elements.apkgStatus.textContent = `Import fehlgeschlagen: ${error.message}`;
    elements.apkgPreview.innerHTML = '';
  } finally {
    elements.importApkgButton.disabled = !selectedApkgFile;
  }
}

async function analyzeApkgFile(file) {
  if (!file) throw new Error('keine Datei ausgewählt.');
  if (!file.name.toLowerCase().endsWith('.apkg')) throw new Error('Die ausgewählte Datei ist keine .apkg Datei.');
  checkAnkiImportDependencies({ requireZip: true });
  const zip = await readApkgZip(file);
  const collection = await selectBestAnkiCollection(zip);
  const databaseBytes = await loadSqlDatabaseFromCollection(collection);
  const db = await loadSqlDatabase(databaseBytes);
  const collectionData = readAnkiCardsFromDatabase(db);
  if (db.close) db.close();
  const analysis = convertAnkiCardsToLocalCards(file, collection, collectionData);
  if (analysis.importableCards.length === 0 && analysis.placeholderOnly) {
    throw new Error('Die Datei enthält nur eine Anki-Fallback-Platzhalterkarte. Bitte nutze collection.anki21b.');
  }
  return analysis;
}

function checkAnkiImportDependencies(options = {}) {
  if (options.requireZip && !globalThis.JSZip) throw new Error('JSZip konnte nicht geladen werden. Prüfe vendor/jszip.min.js.');
  if (!globalThis.initSqlJs && typeof SimpleSQLiteDatabase === 'undefined') throw new Error('SQL.js konnte nicht geladen werden und der integrierte SQLite-Leser ist nicht verfügbar.');
  if (options.requireZstd && !getZstdDecoder()) throw new Error('collection.anki21b ist Zstandard-komprimiert, aber kein Zstandard-Decoder ist verfügbar.');
  return { ok: true };
}

async function readApkgZip(file) {
  checkAnkiImportDependencies({ requireZip: true });
  try { return await globalThis.JSZip.loadAsync(file); }
  catch (error) { throw new Error(`Die Datei ist kein gültiges ZIP/.apkg Archiv. ${error.message}`); }
}

async function selectBestAnkiCollection(zip) {
  if (zip.file('collection.anki21b')) return collectionFromZip(zip, 'collection.anki21b');
  if (zip.file('collection.anki21')) return collectionFromZip(zip, 'collection.anki21');
  if (zip.file('collection.anki2')) return collectionFromZip(zip, 'collection.anki2');
  throw new Error('keine Collection gefunden.');
}

async function collectionFromZip(zip, name) {
  return { name, type: name, fileData: await zip.file(name).async('uint8array') };
}

async function loadSqlDatabaseFromCollection(collection) {
  if (looksLikeSqlite(collection.fileData)) return collection.fileData;
  if (collection.name === 'collection.anki21b' && looksLikeZstd(collection.fileData)) {
    checkAnkiImportDependencies({ requireZstd: true });
    try {
      const decoder = getZstdDecoder();
      const decompressed = await decoder(collection.fileData);
      const bytes = decompressed instanceof Uint8Array ? decompressed : new Uint8Array(decompressed);
      if (!looksLikeSqlite(bytes)) throw new Error('entpacktes Ergebnis ist keine SQLite-Datenbank.');
      return bytes;
    } catch (error) {
      throw new Error(`collection.anki21b ist Zstandard-komprimiert, konnte aber nicht entpackt werden: ${error.message}`);
    }
  }
  if (collection.name === 'collection.anki21b') throw new Error('collection.anki21b ist nicht als SQLite-Datenbank lesbar. Es wird kein collection.anki2-Fallback importiert.');
  throw new Error(`${collection.name} ist keine lesbare SQLite-Datenbank.`);
}

function looksLikeSqlite(bytes) {
  const header = 'SQLite format 3';
  if (!bytes || bytes.length < header.length) return false;
  return header.split('').every((char, index) => bytes[index] === char.charCodeAt(0));
}

function looksLikeZstd(bytes) {
  return bytes && bytes.length >= 4 && bytes[0] === 0x28 && bytes[1] === 0xb5 && bytes[2] === 0x2f && bytes[3] === 0xfd;
}

function getZstdDecoder() {
  if (globalThis.ZstdCodec?.run) return (bytes) => new Promise((resolve) => globalThis.ZstdCodec.run((zstd) => resolve(zstd.Simple.decompress(bytes))));
  if (globalThis.ZSTDDecoder) return async (bytes) => { const decoder = new globalThis.ZSTDDecoder(); if (decoder.init) await decoder.init(); return decoder.decode(bytes); };
  if (globalThis.zstddec?.decompress) return (bytes) => globalThis.zstddec.decompress(bytes);
  return null;
}

async function loadSqlDatabase(bytes) {
  if (globalThis.initSqlJs) {
    try {
      const SQL = await globalThis.initSqlJs({ locateFile: (fileName) => `vendor/${fileName}` });
      return new SQL.Database(bytes);
    } catch (error) {
      throw new Error(`SQLite-Datenbank konnte mit SQL.js nicht gelesen werden: ${error.message}`);
    }
  }
  return new SimpleSQLiteDatabase(bytes);
}

function readAnkiCardsFromDatabase(db) {
  const tables = getSqlTableNames(db);
  if (!tables.includes('notes') || !tables.includes('cards')) throw new Error('Tabellen notes oder cards fehlen.');
  if (tables.includes('col')) {
    try {
      const oldSchema = readOldAnkiSchema(db);
      if (Object.keys(oldSchema.models).length && Object.keys(oldSchema.decks).length) return oldSchema;
    } catch (error) {
      console.warn('Altes Anki-Schema nicht vollständig nutzbar, versuche neues Schema.', error);
    }
  }
  return readNewAnkiSchema(db, tables);
}

function getSqlTableNames(db) {
  return selectRows(db, "select name from sqlite_master where type='table'").map((row) => row.name);
}

function readOldAnkiSchema(db) {
  const colRows = selectRows(db, 'select models, decks from col limit 1');
  if (!colRows.length || !colRows[0].models || !colRows[0].decks) throw new Error('col.models oder col.decks ist leer.');
  return {
    models: parseAnkiModels(colRows[0].models),
    decks: parseAnkiDecks(colRows[0].decks),
    notes: parseAnkiNotes(db),
    cards: parseAnkiCards(db),
  };
}

function readNewAnkiSchema(db, tables) {
  for (const required of ['decks', 'notetypes', 'fields', 'cards', 'notes']) {
    if (!tables.includes(required)) throw new Error('weder altes noch neues Anki-Schema kann gelesen werden.');
  }
  const decks = {};
  selectRows(db, 'select id, name from decks').forEach((deck) => { decks[String(deck.id)] = { id: deck.id, name: deck.name || 'Default' }; });
  const notetypes = {};
  selectRows(db, 'select id, name, config from notetypes').forEach((notetype) => { notetypes[String(notetype.id)] = { id: notetype.id, name: notetype.name || 'Basic', flds: [], type: 0 }; });
  selectRows(db, 'select ntid, name, ord from fields order by ntid asc, ord asc').forEach((field) => {
    const model = notetypes[String(field.ntid)];
    if (model) model.flds.push({ name: field.name, ord: Number(field.ord || model.flds.length) });
  });
  selectRows(db, 'select ntid, name, ord from templates order by ntid asc, ord asc').forEach((template) => {
    const model = notetypes[String(template.ntid)];
    if (model && String(template.name || '').toLowerCase().includes('cloze')) model.type = 1;
  });
  return { models: notetypes, decks, notes: parseAnkiNotes(db), cards: parseAnkiCards(db) };
}

function selectRows(db, sql) {
  if (typeof db.exec === 'function') {
    const result = db.exec(sql);
    if (!result.length) return [];
    const { columns, values } = result[0];
    return values.map((valueRow) => Object.fromEntries(columns.map((column, index) => [column, valueRow[index]])));
  }
  return db.selectRows(sql);
}

function parseAnkiModels(modelsJson) { try { return JSON.parse(modelsJson); } catch { throw new Error('models JSON aus Tabelle col ist ungültig.'); } }
function parseAnkiDecks(decksJson) { try { return JSON.parse(decksJson); } catch { throw new Error('decks JSON aus Tabelle col ist ungültig.'); } }
function parseAnkiNotes(db) { return selectRows(db, 'select id, mid, flds, tags from notes'); }
function parseAnkiCards(db) { return selectRows(db, 'select id, nid, did, ord from cards order by id asc'); }

function convertAnkiCardsToLocalCards(file, collection, collectionData) {
  const warnings = [];
  const skipped = [];
  const importableCards = [];
  const notesById = new Map(collectionData.notes.map((note) => [String(note.id), note]));
  const fallbackDeckName = cleanDeckNameFromFile(file.name);

  for (const ankiCard of collectionData.cards) {
    const note = notesById.get(String(ankiCard.nid));
    const model = note ? collectionData.models[String(note.mid)] : null;
    const deck = collectionData.decks[String(ankiCard.did)] || { name: fallbackDeckName };
    if (!note || !model) { skipped.push({ reason: 'unsupported', message: `Karte ${ankiCard.id}: Notiz oder Model fehlt.` }); continue; }
    const converted = convertAnkiCardToLocalCard(ankiCard, note, model, deck, fallbackDeckName, warnings);
    if (!converted.card) { skipped.push(converted.skipped); continue; }
    if (isPlaceholderCard(converted.card)) { skipped.push({ reason: 'placeholder', message: `Karte ${ankiCard.id}: Platzhalter-/Update-Hinweis wurde nicht importiert.` }); continue; }
    if (isDuplicateImportedCard(converted.card, importableCards)) { skipped.push({ reason: 'duplicate', message: `Karte ${ankiCard.id}: Duplikat wurde übersprungen.` }); continue; }
    importableCards.push(converted.card);
  }
  const placeholderOnly = collection.name === 'collection.anki2' && collectionData.cards.length > 0 && importableCards.length === 0 && skipped.some((item) => item.reason === 'placeholder');
  return {
    fileName: file.name,
    databaseType: collection.type,
    ankiDecks: Object.values(collectionData.decks).map((deck) => deck.name).filter(Boolean),
    deckNames: [...new Set(importableCards.map((card) => card.anki_deck_name))],
    noteCount: collectionData.notes.length,
    cardCount: collectionData.cards.length,
    importableCards,
    skipped,
    warnings: [...new Set(warnings)],
    placeholderOnly,
  };
}

function mapAnkiNoteFields(note, model) {
  const values = String(note.flds || '').split('\x1f');
  const fieldMap = {};
  const fields = Array.isArray(model.flds) ? model.flds.slice().sort((a, b) => Number(a.ord || 0) - Number(b.ord || 0)) : [];
  fields.forEach((field, index) => { fieldMap[field.name] = values[index] || ''; });
  if (!fields.length) values.forEach((value, index) => { fieldMap[`Field ${index + 1}`] = value; });
  return fieldMap;
}

function convertAnkiCardToLocalCard(ankiCard, ankiNote, model, deck, fallbackDeckName, warnings) {
  const modelName = String(model.name || '').toLowerCase();
  const fields = mapAnkiNoteFields(ankiNote, model);
  let converted;
  if (modelName.includes('image occlusion')) return { skipped: { reason: 'unsupported', message: 'Image-Occlusion-Karten werden im MVP noch nicht unterstützt.' } };
  if (Number(model.type) === 1 || modelName.includes('cloze')) converted = convertClozeCard(ankiCard, fields, warnings);
  else if (modelName.includes('optional') && modelName.includes('reverse')) converted = convertOptionalReversedCard(ankiCard, fields);
  else if (modelName.includes('reverse')) converted = convertBasicReversedCard(ankiCard, fields);
  else if (modelName.includes('type')) converted = convertTypeInAnswerCard(fields);
  else converted = convertBasicCard(fields);
  if (!converted.card) return converted;
  if (/\[(sound|anki:play)[^\]]*\]|<img\b|<audio\b|<video\b/i.test(`${converted.rawQuestion || ''} ${converted.rawAnswer || ''}`)) warnings.push('Medienreferenzen wurden erkannt. Medienimport ist im MVP nicht aktiv; importiert wird nur verständlicher Text.');
  return { card: createImportedCard(converted.card.question, converted.card.answer, normalizeImportedDeckName(deck.name, fallbackDeckName), ankiNote.id, ankiCard.id) };
}

function pickField(fields, names, fallbackIndex) {
  for (const name of names) {
    const key = Object.keys(fields).find((fieldName) => fieldName.toLowerCase() === name.toLowerCase());
    if (key) return fields[key];
  }
  return Object.values(fields)[fallbackIndex] || '';
}

function convertBasicCard(fields) { return cardFromFields(pickField(fields, ['Front', 'Vorderseite'], 0), pickField(fields, ['Back', 'Rückseite'], 1)); }
function convertBasicReversedCard(ankiCard, fields) { return Number(ankiCard.ord) === 1 ? cardFromFields(pickField(fields, ['Back', 'Rückseite'], 1), pickField(fields, ['Front', 'Vorderseite'], 0)) : convertBasicCard(fields); }
function convertOptionalReversedCard(ankiCard, fields) { if (Number(ankiCard.ord) === 1 && !String(fields['Add Reverse'] || '').trim()) return { skipped: { reason: 'unsupported', message: 'Optionale Rückseitenkarte ohne Add-Reverse-Feld wurde übersprungen.' } }; return convertBasicReversedCard(ankiCard, fields); }
function convertTypeInAnswerCard(fields) { return convertBasicCard(fields); }

function convertClozeCard(ankiCard, fields, warnings) {
  const text = fields.Text || fields.Vorderseite || fields.Front || Object.values(fields)[0] || '';
  const extra = fields.Extra || fields.Rückseite || fields.Back ? `\n\n${fields.Extra || fields.Rückseite || fields.Back}` : '';
  const clozeNumber = Number(ankiCard.ord) + 1;
  const pattern = new RegExp(`{{c${clozeNumber}::(.*?)(?:::.*?)?}}`, 'gi');
  if (!pattern.test(text)) { warnings.push('Cloze-Karte ohne passende einfache Cloze-Lücke wurde übersprungen.'); return { skipped: { reason: 'unsupported', message: `Cloze-Karte ${ankiCard.id}: keine passende c${clozeNumber}-Lücke gefunden.` } }; }
  pattern.lastIndex = 0;
  if ((text.match(/{{c\d+::/g) || []).length > 1) warnings.push('Mehrere Cloze-Lücken erkannt; sie wurden vereinfacht importiert.');
  return cardFromFields(text.replace(pattern, '[...]'), text.replace(pattern, '$1') + extra);
}

function cardFromFields(rawQuestion, rawAnswer) {
  const question = sanitizeAnkiHtml(rawQuestion);
  const answer = sanitizeAnkiHtml(rawAnswer);
  if (!question) return { skipped: { reason: 'empty', message: 'Karte mit leerer Frage wurde übersprungen.' } };
  if (!answer) return { skipped: { reason: 'empty', message: 'Karte mit leerer Antwort wurde übersprungen.' } };
  return { card: { question, answer }, rawQuestion, rawAnswer };
}

function createImportedCard(question, answer, ankiDeckName, noteId, cardId) {
  const now = new Date().toISOString();
  return { card_id: createId('card'), deck_id: '', question, answer, created_at: now, updated_at: now, due_at: now, interval_minutes: 0, correct_count: 0, incorrect_count: 0, last_reviewed_at: null, review_history: [], source_type: 'anki', source_note_id: String(noteId), source_card_id: String(cardId), imported_at: now, anki_deck_name: ankiDeckName };
}

function sanitizeAnkiHtml(input) {
  const stripped = stripDangerousHtml(String(input || ''));
  const template = document.createElement('template');
  template.innerHTML = stripped.replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/p\s*>/gi, '\n').replace(/<\/div\s*>/gi, '\n').replace(/<li\s*>/gi, '\n- ');
  template.content.querySelectorAll('img,audio,video,source,iframe,object,embed').forEach((node) => node.remove());
  return template.content.textContent.replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function stripDangerousHtml(input) { return String(input || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '').replace(/javascript:/gi, ''); }
function normalizeTextForDuplicateCheck(input) { return String(input || '').trim().replace(/\s+/g, ' ').toLowerCase(); }

function isDuplicateImportedCard(localCard, pendingCards = []) {
  if (appState.cards.some((card) => card.source_type === 'anki' && String(card.source_card_id) === String(localCard.source_card_id))) return true;
  if (pendingCards.some((card) => String(card.source_card_id) === String(localCard.source_card_id))) return true;
  const question = normalizeTextForDuplicateCheck(localCard.question); const answer = normalizeTextForDuplicateCheck(localCard.answer);
  return [...appState.cards, ...pendingCards].some((card) => {
    const existingDeckName = card.anki_deck_name || getDeck(card.deck_id)?.deck_name || '';
    const incomingDeckName = localCard.anki_deck_name || getDeck(localCard.deck_id)?.deck_name || '';
    return normalizeTextForDuplicateCheck(card.question) === question && normalizeTextForDuplicateCheck(card.answer) === answer && normalizeTextForDuplicateCheck(existingDeckName) === normalizeTextForDuplicateCheck(incomingDeckName);
  });
}

function isPlaceholderCard(card) { const text = normalizeTextForDuplicateCheck(`${card.question} ${card.answer}`); return text.includes('bitte installieren sie die aktuelle anki-version') || text.includes('please update to the latest anki version'); }
function normalizeImportedDeckName(ankiDeckName, fallbackDeckName) { const name = String(ankiDeckName || '').trim(); if (!name || name.toLowerCase() === 'default') return fallbackDeckName; return name.split('::').filter(Boolean).pop() || fallbackDeckName; }
function cleanDeckNameFromFile(fileName) { return String(fileName || 'Anki Import').replace(/\.apkg$/i, '').trim() || 'Anki Import'; }

function createDecksForAnkiImport(importableCards) {
  const map = new Map();
  for (const card of importableCards) {
    if (map.has(card.anki_deck_name)) continue;
    const now = new Date().toISOString();
    const deck = { deck_id: createId('deck'), deck_name: createUniqueDeckName(card.anki_deck_name), created_at: now, updated_at: now };
    map.set(card.anki_deck_name, deck);
  }
  return map;
}

function createUniqueDeckName(baseName) { const existing = new Set(appState.decks.map((deck) => deck.deck_name.toLowerCase())); if (!existing.has(baseName.toLowerCase())) return baseName; let counter = 2; while (existing.has(`${baseName} (Import ${counter})`.toLowerCase())) counter += 1; return `${baseName} (Import ${counter})`; }

function saveImportedAnkiCards(analysis) {
  const deckMap = createDecksForAnkiImport(analysis.importableCards);
  const decksToAdd = [...deckMap.values()];
  const cardsToAdd = [];
  const skippedDuringSave = [];
  for (const card of analysis.importableCards) {
    const deck = deckMap.get(card.anki_deck_name);
    const localCard = { ...card, deck_id: deck.deck_id };
    delete localCard.anki_deck_name;
    if (isDuplicateImportedCard(localCard, cardsToAdd)) { skippedDuringSave.push({ reason: 'duplicate', message: `Karte ${localCard.source_card_id}: Duplikat wurde beim Speichern übersprungen.` }); continue; }
    cardsToAdd.push(localCard);
  }
  appState.decks.push(...decksToAdd); appState.cards.push(...cardsToAdd); saveData();
  selectedManagementDeckId = decksToAdd[0]?.deck_id || selectedManagementDeckId; selectedLearningDeckId = decksToAdd[0]?.deck_id || selectedLearningDeckId; refreshCurrentView();
  return makeImportSummary(analysis, cardsToAdd.length, decksToAdd.length, skippedDuringSave);
}

function makeImportSummary(analysis, importedCount, deckCount, skippedDuringSave) {
  const allSkipped = analysis.skipped.concat(skippedDuringSave);
  return { deckCount, foundCount: analysis.cardCount, importedCount, duplicateCount: allSkipped.filter((item) => item.reason === 'duplicate').length, emptyCount: allSkipped.filter((item) => item.reason === 'empty').length, unsupportedCount: allSkipped.filter((item) => item.reason === 'unsupported' || item.reason === 'placeholder').length, warningCount: analysis.warnings.length + skippedDuringSave.length, warnings: analysis.warnings.concat(allSkipped.map((item) => item.message)) };
}

function renderApkgImportSummary(summary, analysis) {
  elements.apkgPreview.innerHTML = `<h3>Import abgeschlossen.</h3>
    <div class="summary-grid">
      <span><strong>${summary.deckCount}</strong>Decks erstellt</span><span><strong>${summary.foundCount}</strong>Karten gefunden</span><span><strong>${summary.importedCount}</strong>Karten importiert</span>
      <span><strong>${summary.duplicateCount}</strong>Duplikate übersprungen</span><span><strong>${summary.emptyCount}</strong>Leere Karten übersprungen</span><span><strong>${summary.unsupportedCount}</strong>Nicht unterstützte Karten</span>
    </div>
    <p>Datenbanktyp: ${escapeHtml(analysis.databaseType)}</p>
    <p>Warnungen: ${summary.warningCount}</p>${renderWarningList(summary.warnings)}`;
}

function renderWarningList(warnings) { if (!warnings.length) return '<p>Keine Warnungen.</p>'; return `<ul class="warning-list">${warnings.slice(0, 80).map((warning) => `<li>${escapeHtml(warning)}</li>`).join('')}</ul>`; }

class SimpleSQLiteDatabase {
  constructor(bytes) { this.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes); this.view = new DataView(this.bytes.buffer, this.bytes.byteOffset, this.bytes.byteLength); this.pageSize = this.view.getUint16(16) || 65536; this.schemas = null; }
  close() {}
  selectRows(sql) {
    const normalized = sql.toLowerCase().replace(/\s+/g, ' ').trim();
    if (normalized.includes('sqlite_master')) { const rows = this.getSchemas(); return normalized.includes("name in ('col','notes','cards')") ? rows.filter((row) => ['col','notes','cards'].includes(row.name)) : rows; }
    const tableMatch = normalized.match(/from\s+([a-z0-9_]+)/); if (!tableMatch) throw new Error(`SQL nicht unterstützt: ${sql}`);
    const table = tableMatch[1]; let rows = this.readTable(table);
    const selectPart = normalized.slice(6, normalized.indexOf(' from ')).trim();
    const columns = selectPart === '*' ? null : selectPart.split(',').map((part) => part.trim().split(/\s+/)[0]);
    if (columns) rows = rows.map((row) => Object.fromEntries(columns.map((column) => [column, row[column]])));
    if (normalized.includes('limit 1')) rows = rows.slice(0, 1);
    return rows;
  }
  getSchemas() { if (!this.schemas) this.schemas = this.readTable('sqlite_master'); return this.schemas; }
  readTable(name) { const schema = name === 'sqlite_master' ? { rootpage: 1, sql: 'CREATE TABLE sqlite_master(type,name,tbl_name,rootpage,sql)' } : this.getSchemas().find((row) => row.name === name); if (!schema) throw new Error(`SQLite-Tabelle ${name} fehlt.`); const columns = this.columnsFromCreateSql(schema.sql); return this.readTablePages(Number(schema.rootpage), columns); }
  columnsFromCreateSql(sql) { const inside = String(sql || '').slice(String(sql || '').indexOf('(') + 1, String(sql || '').lastIndexOf(')')); return inside.split(/,(?![^()]*\))/).map((part) => part.trim().replace(/^["'`]|["'`]$/g, '').split(/\s+/)[0].replace(/["'`]/g, '')).filter((name) => name && !['primary','constraint','unique','foreign','check'].includes(name.toLowerCase())); }
  pageOffset(pageNumber) { return (pageNumber - 1) * this.pageSize; }
  readTablePages(pageNumber, columns) { const offset = this.pageOffset(pageNumber); const headerOffset = pageNumber === 1 ? 100 : 0; const pageType = this.bytes[offset + headerOffset]; const cellCount = this.view.getUint16(offset + headerOffset + 3); const rows = []; if (pageType === 0x0d) { for (let i = 0; i < cellCount; i++) { const ptr = this.view.getUint16(offset + headerOffset + 8 + i * 2); rows.push(this.readTableLeafCell(offset + ptr, columns)); } } else if (pageType === 0x05) { const rightMost = this.view.getUint32(offset + headerOffset + 8); for (let i = 0; i < cellCount; i++) { const ptr = this.view.getUint16(offset + headerOffset + 12 + i * 2); rows.push(...this.readTablePages(this.view.getUint32(offset + ptr), columns)); } rows.push(...this.readTablePages(rightMost, columns)); } else throw new Error(`SQLite-Seitentyp ${pageType} wird nicht unterstützt.`); return rows; }
  readTableLeafCell(offset, columns) { const payloadInfo = this.readVarint(offset); const rowidInfo = this.readVarint(payloadInfo.next); const payloadStart = rowidInfo.next; const payload = this.readPayload(payloadStart, payloadInfo.value); const values = this.parseRecord(payload); const row = {}; columns.forEach((column, index) => { row[column] = values[index]; }); if (row.rowid === undefined) row.rowid = rowidInfo.value; return row; }
  readPayload(offset, payloadSize) { const maxLocal = this.pageSize - 35; const minLocal = Math.floor((this.pageSize - 12) * 32 / 255) - 23; let localSize = payloadSize; if (payloadSize > maxLocal) { localSize = minLocal + ((payloadSize - minLocal) % (this.pageSize - 4)); if (localSize > maxLocal) localSize = minLocal; } const chunks = [this.bytes.slice(offset, offset + localSize)]; let remaining = payloadSize - localSize; let overflowPage = remaining > 0 ? this.view.getUint32(offset + localSize) : 0; while (remaining > 0 && overflowPage) { const pageOffset = this.pageOffset(overflowPage); const nextPage = this.view.getUint32(pageOffset); const take = Math.min(remaining, this.pageSize - 4); chunks.push(this.bytes.slice(pageOffset + 4, pageOffset + 4 + take)); remaining -= take; overflowPage = nextPage; } const out = new Uint8Array(payloadSize); let cursor = 0; chunks.forEach((chunk) => { out.set(chunk, cursor); cursor += chunk.length; }); return out; }
  parseRecord(payload) { const headerSizeInfo = this.readVarintFrom(payload, 0); let cursor = headerSizeInfo.next; const types = []; while (cursor < headerSizeInfo.value) { const info = this.readVarintFrom(payload, cursor); types.push(info.value); cursor = info.next; } let body = headerSizeInfo.value; return types.map((type) => { const value = this.readSerialValue(payload, body, type); body += value.length; return value.value; }); }
  readSerialValue(payload, offset, type) { if (type === 0) return { value: null, length: 0 }; if (type === 1) return { value: this.signed(payload, offset, 1), length: 1 }; if (type === 2) return { value: this.signed(payload, offset, 2), length: 2 }; if (type === 3) return { value: this.signed(payload, offset, 3), length: 3 }; if (type === 4) return { value: this.signed(payload, offset, 4), length: 4 }; if (type === 5) return { value: this.signed(payload, offset, 6), length: 6 }; if (type === 6) return { value: Number(this.bigSigned(payload, offset, 8)), length: 8 }; if (type === 7) return { value: new DataView(payload.buffer, payload.byteOffset + offset, 8).getFloat64(0), length: 8 }; if (type === 8) return { value: 0, length: 0 }; if (type === 9) return { value: 1, length: 0 }; const length = Math.floor((type - 12) / 2); const data = payload.slice(offset, offset + length); return { value: type % 2 === 0 ? data : new TextDecoder().decode(data), length }; }
  signed(payload, offset, length) { let value = 0; for (let i = 0; i < length; i++) value = (value << 8) | payload[offset + i]; const sign = 1 << (length * 8 - 1); return value & sign ? value - 2 ** (length * 8) : value; }
  bigSigned(payload, offset, length) { let value = 0n; for (let i = 0; i < length; i++) value = (value << 8n) | BigInt(payload[offset + i]); const sign = 1n << BigInt(length * 8 - 1); return value & sign ? value - (1n << BigInt(length * 8)) : value; }
  readVarint(offset) { return this.readVarintFrom(this.bytes, offset); }
  readVarintFrom(bytes, offset) { let value = 0; let i = 0; for (; i < 8; i++) { value = (value << 7) | (bytes[offset + i] & 0x7f); if ((bytes[offset + i] & 0x80) === 0) return { value, next: offset + i + 1 }; } value = (value << 8) | bytes[offset + 8]; return { value, next: offset + 9 }; }
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
