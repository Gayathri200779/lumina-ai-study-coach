
"use strict";

const STORAGE_KEY = "luminaNotes";
const LEGACY_KEY = "luminaNotesLegacyImported";

const grid = document.getElementById("subjectsGrid");
const searchInput = document.getElementById("searchInput");
const subjectFilter = document.getElementById("subjectFilter");
const modal = document.getElementById("noteModal");
const noteForm = document.getElementById("noteForm");
const noteTitle = document.getElementById("noteTitle");
const noteSubject = document.getElementById("noteSubject");
const noteContent = document.getElementById("noteContent");
const modalTitle = document.getElementById("modalTitle");
const saveNoteBtn = document.getElementById("saveNoteBtn");
const saveStatus = document.getElementById("saveStatus");

let notes = loadNotes();
let editingNoteId = null;
let currentSearch = "";
let currentFilter = "";
let activeSubject = null;
let activeReaderNoteId = null;
let quickAddVisible = false;

const subjectIcons = [
  "📘", "🧠", "📊", "🐍", "🧪",
  "🧮", "🌍", "💡", "🎨", "🧬", "📐"
];

function createId() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "note-" + Date.now() + "-" +
    Math.random().toString(36).slice(2);
}

function isValidNote(note) {
  return note &&
    typeof note === "object" &&
    typeof note.title === "string" &&
    typeof note.subject === "string" &&
    typeof note.content === "string";
}

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter(isValidNote)
        : [];
    }

    if (localStorage.getItem(LEGACY_KEY) !== "true") {
      const examples = [
        {
          title: "Neural Networks",
          subject: "Artificial Intelligence",
          content:
            "Neural networks mimic brain structure using layers of nodes."
        },
        {
          title: "Supervised Learning",
          subject: "Artificial Intelligence",
          content:
            "Supervised learning requires labelled training data."
        },
        {
          title: "Reinforcement Learning",
          subject: "Artificial Intelligence",
          content:
            "Reinforcement learning improves actions using rewards."
        },
        {
          title: "Standard Deviation",
          subject: "Statistics",
          content:
            "Standard deviation measures how spread out values are."
        },
        {
          title: "P-values",
          subject: "Statistics",
          content:
            "A p-value helps evaluate evidence against a statistical hypothesis."
        },
        {
          title: "List Comprehensions",
          subject: "Python",
          content:
            "List comprehensions provide a concise way to create lists."
        },
        {
          title: "Virtual Environments",
          subject: "Python",
          content:
            "Virtual environments isolate project dependencies."
        },
        {
          title: "Decorators",
          subject: "Python",
          content:
            "Decorators modify or extend the behaviour of functions."
        }
      ].map(note => {
        const now = new Date().toISOString();

        return {
          id: createId(),
          ...note,
          source: "manual",
          createdAt: now,
          updatedAt: now
        };
      });

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(examples)
      );

      localStorage.setItem(LEGACY_KEY, "true");

      return examples;
    }

    return [];
  } catch (error) {
    console.error("Unable to load notes:", error);
    return [];
  }
}

function saveNotes() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(notes)
    );

    saveStatus.textContent = "Notes saved on this device.";
    return true;
  } catch (error) {
    console.error("Unable to save notes:", error);
    saveStatus.textContent =
      "Unable to save notes. Please try again.";
    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getSubjectNames() {
  return [
    ...new Set(
      notes.map(note => note.subject.trim()).filter(Boolean)
    )
  ].sort((a, b) => a.localeCompare(b));
}

function getIcon(subject) {
  const icons = {
    "Artificial Intelligence": "🧠",
    "Natural Language Processing": "💬",
    "NLP": "💬",
    "Computer Vision": "👁️",
    "Statistics": "📊",
    "Python": "🐍",
    "Operating Systems": "💻",
    "Expert Systems": "⚙️"
  };

  if (icons[subject]) return icons[subject];

  let total = 0;

  for (const character of subject) {
    total += character.charCodeAt(0);
  }

  return subjectIcons[total % subjectIcons.length];
}

/* Popup styles: existing page styles and fonts are preserved. */
function addPopupStyles() {
  if (document.getElementById("luminaNotesPopupStyles")) return;

  const style = document.createElement("style");
  style.id = "luminaNotesPopupStyles";

  style.textContent = `
    .lumina-popup-overlay {
      position: fixed;
      inset: 0;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(31, 47, 37, 0.42);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      box-sizing: border-box;
    }

    .lumina-popup-overlay.lumina-popup-open {
      display: flex;
    }

    #luminaTopicsOverlay {
      z-index: 9000;
    }

    #luminaReaderOverlay {
      z-index: 9001;
    }

    .lumina-popup-panel {
      width: min(540px, 100%);
      max-height: 84vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: #FBFCFA;
      color: #344638;
      border: 1px solid #DDE9DF;
      border-radius: 20px;
      box-shadow: 0 20px 65px rgba(30, 55, 37, 0.22);
      font-family: inherit;
    }

    .lumina-popup-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 20px 22px;
      background: #F6FAF7;
      border-bottom: 1px solid #E4EEE6;
    }

    .lumina-popup-heading {
      min-width: 0;
    }

    .lumina-popup-heading h2 {
      margin: 0;
      color: #4F6F52;
      font-family: inherit;
      font-size: 20px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .lumina-popup-subtitle {
      margin: 5px 0 0;
      color: #718174;
      font-size: 13px;
    }

    .lumina-popup-close {
      flex-shrink: 0;
      width: 36px;
      height: 36px;
      border: 1px solid #DCE8DE;
      border-radius: 50%;
      background: #FFFFFF;
      color: #4F6F52;
      font-size: 22px;
      line-height: 1;
      cursor: pointer;
    }

    .lumina-popup-close:hover {
      background: #EAF4EC;
    }

    .lumina-topics-list {
      padding: 12px 16px;
      overflow-y: auto;
      overscroll-behavior: contain;
    }

    .lumina-topic-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 5px 0;
      border-bottom: 1px solid #EAF0EB;
    }

    .lumina-topic-title {
      flex: 1;
      min-width: 0;
      padding: 13px 10px;
      border: 0;
      border-radius: 9px;
      background: transparent;
      color: #344638;
      font-family: inherit;
      font-size: 15px;
      line-height: 1.5;
      text-align: left;
      overflow-wrap: anywhere;
      cursor: pointer;
    }

    .lumina-topic-title:hover {
      background: #EEF8F3;
      color: #4F6F52;
    }

    .lumina-topic-actions {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .lumina-topic-action {
      padding: 7px 9px;
      border: 1px solid #DCE8DE;
      border-radius: 8px;
      background: #FFFFFF;
      color: #4F6F52;
      font-family: inherit;
      font-size: 12px;
      cursor: pointer;
    }

    .lumina-topic-action:hover {
      background: #EEF8F3;
    }

    .lumina-topic-action.delete {
      color: #B24A4A;
    }

    .lumina-topics-footer {
      padding: 13px 18px;
      border-top: 1px solid #E4EEE6;
      background: #F6FAF7;
    }

    .lumina-quick-add-toggle {
      width: 100%;
      padding: 10px 12px;
      border: 1px dashed #A9C4AD;
      border-radius: 10px;
      background: transparent;
      color: #4F6F52;
      font-family: inherit;
      font-size: 14px;
      cursor: pointer;
    }

    .lumina-quick-add-form {
      display: none;
      gap: 8px;
      margin-top: 10px;
    }

    .lumina-quick-add-form.visible {
      display: flex;
    }

    .lumina-quick-add-form input {
      flex: 1;
      min-width: 0;
      padding: 10px 12px;
      border: 1px solid #D5E3D8;
      border-radius: 9px;
      outline-color: #6B9080;
      font: inherit;
    }

    .lumina-quick-add-form button {
      padding: 10px 14px;
      border: 0;
      border-radius: 9px;
      background: #6B9080;
      color: white;
      font-family: inherit;
      cursor: pointer;
    }

    .lumina-topic-empty {
      padding: 26px 12px;
      color: #718174;
      text-align: center;
      font-size: 14px;
    }

    .lumina-reader-panel {
      width: min(1050px, 100%);
      height: 91vh;
      max-height: 94vh;
      border-radius: 18px;
    }

    .lumina-reader-header {
      padding: 20px 26px;
    }

    .lumina-reader-content {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 30px clamp(20px, 5vw, 58px);
      background: #FBFCFA;
      overscroll-behavior: contain;
    }

    .lumina-reader-subject {
      margin: 0 0 10px;
      color: #6B9080;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    .lumina-reader-title {
      margin: 0 0 24px;
      color: #4F6F52;
      font-family: inherit;
      font-size: clamp(23px, 3vw, 32px);
      font-weight: 600;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    .lumina-reader-answer {
      color: #344638;
      font-family: inherit;
      font-size: 16px;
      line-height: 1.95;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    .lumina-reader-source {
      display: inline-block;
      margin-top: 22px;
      padding: 6px 10px;
      border-radius: 8px;
      background: #EEF8F3;
      color: #4F6F52;
      font-size: 12px;
    }

    .lumina-reader-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 14px 22px;
      border-top: 1px solid #E4EEE6;
      background: #F6FAF7;
    }

    .lumina-reader-footer button {
      padding: 10px 17px;
      border: 1px solid #D5E3D8;
      border-radius: 9px;
      background: #FFFFFF;
      color: #4F6F52;
      font-family: inherit;
      cursor: pointer;
    }

    .lumina-reader-footer .lumina-reader-edit {
      background: #6B9080;
      color: #FFFFFF;
      border-color: #6B9080;
    }

    .lumina-reader-footer .lumina-reader-delete {
      color: #B24A4A;
    }

    .lumina-reader-footer .lumina-reader-left,
    .lumina-reader-footer .lumina-reader-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .lumina-popup-overlay button:focus-visible {
      outline: 2px solid #6B9080;
      outline-offset: 3px;
    }

    @media (max-width: 600px) {
      .lumina-popup-overlay {
        padding: 10px;
      }

      .lumina-popup-panel {
        max-height: 88vh;
        border-radius: 15px;
      }

      .lumina-popup-header {
        padding: 16px;
      }

      .lumina-popup-heading h2 {
        font-size: 18px;
      }

      .lumina-topic-row {
        gap: 5px;
      }

      .lumina-topic-actions {
        gap: 4px;
      }

      .lumina-topic-action {
        padding: 7px;
      }

      .lumina-reader-panel {
        width: 100%;
        height: 94vh;
        max-height: 96vh;
      }

      .lumina-reader-content {
        padding: 23px 19px;
      }

      .lumina-reader-answer {
        font-size: 15px;
        line-height: 1.9;
      }

      .lumina-reader-footer {
        padding: 12px;
        flex-wrap: wrap;
      }

      .lumina-reader-footer button {
        padding: 9px 11px;
        font-size: 13px;
      }
    }
  `;

  document.head.appendChild(style);
}

/* Create the two popups without changing my-notes.html. */
function createPopupElements() {
  if (!document.getElementById("luminaTopicsOverlay")) {
    const topicsOverlay = document.createElement("div");
    topicsOverlay.id = "luminaTopicsOverlay";
    topicsOverlay.className = "lumina-popup-overlay";
    topicsOverlay.setAttribute("aria-hidden", "true");

    topicsOverlay.innerHTML = `
      <section class="lumina-popup-panel" role="dialog"
               aria-modal="true" aria-labelledby="luminaTopicsTitle">
        <header class="lumina-popup-header">
          <div class="lumina-popup-heading">
            <h2 id="luminaTopicsTitle">Topics</h2>
            <p class="lumina-popup-subtitle" id="luminaTopicsSubtitle"></p>
          </div>
          <button type="button" class="lumina-popup-close"
                  id="luminaTopicsClose" aria-label="Close topics">&times;</button>
        </header>
        <div class="lumina-topics-list" id="luminaTopicsList"></div>
        <footer class="lumina-topics-footer">
          <button type="button" class="lumina-quick-add-toggle"
                  id="luminaQuickAddToggle">+ Add a quick note</button>
          <form class="lumina-quick-add-form" id="luminaQuickAddForm">
            <input type="text" id="luminaQuickAddInput"
                   maxlength="50000" placeholder="Write a quick note..."
                   aria-label="Quick note content">
            <button type="submit">Add</button>
          </form>
        </footer>
      </section>`;

    document.body.appendChild(topicsOverlay);
  }

  if (!document.getElementById("luminaReaderOverlay")) {
    const readerOverlay = document.createElement("div");
    readerOverlay.id = "luminaReaderOverlay";
    readerOverlay.className = "lumina-popup-overlay";
    readerOverlay.setAttribute("aria-hidden", "true");

    readerOverlay.innerHTML = `
      <section class="lumina-popup-panel lumina-reader-panel"
               role="dialog" aria-modal="true"
               aria-labelledby="luminaReaderTitle">
        <header class="lumina-popup-header lumina-reader-header">
          <div class="lumina-popup-heading">
            <h2>My Notes</h2>
            <p class="lumina-popup-subtitle" id="luminaReaderSubtitle"></p>
          </div>
          <button type="button" class="lumina-popup-close"
                  id="luminaReaderClose" aria-label="Close note">&times;</button>
        </header>
        <main class="lumina-reader-content" id="luminaReaderContent"></main>
        <footer class="lumina-reader-footer">
          <div class="lumina-reader-left">
            <button type="button" id="luminaReaderBack">← Topics</button>
          </div>
          <div class="lumina-reader-right">
            <button type="button" class="lumina-reader-delete"
                    id="luminaReaderDelete">Delete</button>
            <button type="button" class="lumina-reader-edit"
                    id="luminaReaderEdit">Edit Note</button>
          </div>
        </footer>
      </section>`;

    document.body.appendChild(readerOverlay);
  }

  /* Keep the existing create/edit form above the new popups. */
  if (modal) {
    modal.style.zIndex = "10000";
  }
}

function updateSubjectControls() {
  const selected = subjectFilter.value;
  const subjects = getSubjectNames();

  subjectFilter.innerHTML =
    '<option value="">All Subjects</option>' +
    subjects.map(subject =>
      `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`
    ).join("");

  subjectFilter.value = subjects.includes(selected) ? selected : "";

  const subjectOptions = document.getElementById("subjectOptions");

  if (subjectOptions) {
    subjectOptions.innerHTML = subjects.map(subject =>
      `<option value="${escapeHTML(subject)}"></option>`
    ).join("");
  }
}

function getFilteredNotes() {
  const term = currentSearch.trim().toLowerCase();

  return notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(term) ||
      note.subject.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term);

    const matchesSubject =
      !currentFilter || note.subject === currentFilter;

    return matchesSearch && matchesSubject;
  });
}

/* Main My Notes page: show subject cards only. */
function render() {
  updateSubjectControls();

  const filteredNotes = getFilteredNotes();
  const grouped = new Map();

  filteredNotes.forEach(note => {
    if (!grouped.has(note.subject)) {
      grouped.set(note.subject, []);
    }

    grouped.get(note.subject).push(note);
  });

  grid.innerHTML = "";

  if (grouped.size === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const message = document.createElement("p");
    const icon = document.createElement("span");

    icon.textContent = "📚";
    message.textContent = notes.length === 0
      ? "You haven't saved any notes yet. Click Create Note to get started."
      : "No notes match your search or selected subject.";

    empty.append(icon, message);
    grid.appendChild(empty);
    return;
  }

  [...grouped.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([subjectName, subjectNotes]) => {
      const card = document.createElement("article");
      card.className = "subject-card";

      const header = document.createElement("button");
      header.type = "button";
      header.className = "subject-header";
      header.setAttribute("aria-label", "Open " + subjectName);

      header.innerHTML = `
        <div class="subject-icon">${getIcon(subjectName)}</div>
        <div>
          <h3>${escapeHTML(subjectName)}</h3>
          <p class="note-count">
            ${subjectNotes.length}
            ${subjectNotes.length === 1 ? "Topic" : "Topics"}
          </p>
        </div>`;

      header.addEventListener("click", () => {
        openTopicsModal(subjectName);
      });

      card.appendChild(header);
      grid.appendChild(card);
    });
}

/* Stage 1: open a centered popup containing topic titles only. */
function openTopicsModal(subjectName) {
  activeSubject = subjectName;
  quickAddVisible = false;

  const overlay = document.getElementById("luminaTopicsOverlay");
  const title = document.getElementById("luminaTopicsTitle");
  const subtitle = document.getElementById("luminaTopicsSubtitle");
  const quickForm = document.getElementById("luminaQuickAddForm");
  const quickInput = document.getElementById("luminaQuickAddInput");
  const quickToggle = document.getElementById("luminaQuickAddToggle");

  title.textContent = subjectName;
  subtitle.textContent = "Choose a topic to read its complete answer.";
  quickForm.classList.remove("visible");
  quickInput.value = "";
  quickToggle.textContent = "+ Add a quick note";

  renderTopicsList();

  overlay.classList.add("lumina-popup-open");
  overlay.setAttribute("aria-hidden", "false");
  document.getElementById("luminaTopicsClose").focus();
}

function renderTopicsList() {
  const list = document.getElementById("luminaTopicsList");

  if (!activeSubject) return;

  const subjectNotes = getFilteredNotes()
    .filter(note => note.subject === activeSubject)
    .sort((a, b) => a.title.localeCompare(b.title));

  list.innerHTML = "";

  if (subjectNotes.length === 0) {
    const empty = document.createElement("div");
    empty.className = "lumina-topic-empty";
    empty.textContent = "No topics found in this subject.";
    list.appendChild(empty);
    return;
  }

  subjectNotes.forEach(note => {
    const row = document.createElement("div");
    row.className = "lumina-topic-row";

    const titleButton = document.createElement("button");
    titleButton.type = "button";
    titleButton.className = "lumina-topic-title";
    titleButton.textContent = note.title;
    titleButton.addEventListener("click", () => {
      openReader(note.id);
    });

    const actions = document.createElement("div");
    actions.className = "lumina-topic-actions";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "lumina-topic-action";
    editButton.textContent = "Edit";
    editButton.setAttribute("aria-label", "Edit " + note.title);
    editButton.addEventListener("click", () => {
      openEditModal(note.id);
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "lumina-topic-action delete";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", "Delete " + note.title);
    deleteButton.addEventListener("click", () => {
      deleteNote(note.id);
    });

    actions.append(editButton, deleteButton);
    row.append(titleButton, actions);
    list.appendChild(row);
  });
}

function closeTopicsModal() {
  const overlay = document.getElementById("luminaTopicsOverlay");

  overlay.classList.remove("lumina-popup-open");
  overlay.setAttribute("aria-hidden", "true");

  activeSubject = null;
  quickAddVisible = false;
}

/* Stage 2: open a large reader containing the complete answer. */
function openReader(noteId) {
  const note = notes.find(item => item.id === noteId);
  if (!note) return;

  activeReaderNoteId = noteId;

  const overlay = document.getElementById("luminaReaderOverlay");
  const subtitle = document.getElementById("luminaReaderSubtitle");
  const content = document.getElementById("luminaReaderContent");

  subtitle.textContent = note.subject;

  content.innerHTML = "";

  const subject = document.createElement("p");
  subject.className = "lumina-reader-subject";
  subject.textContent = note.subject;

  const title = document.createElement("h1");
  title.className = "lumina-reader-title";
  title.id = "luminaReaderTitle";
  title.textContent = note.title;

  const answer = document.createElement("div");
  answer.className = "lumina-reader-answer";
  answer.textContent = note.content;

  content.append(subject, title, answer);

  if (note.source === "ai-chat" || note.source === "ai-summary") {
    const source = document.createElement("span");
    source.className = "lumina-reader-source";
    source.textContent = note.source === "ai-chat"
      ? "✦ AI Chat Explanation"
      : "✦ AI Summary";
    content.appendChild(source);
  }

  overlay.classList.add("lumina-popup-open");
  overlay.setAttribute("aria-hidden", "false");
  document.getElementById("luminaReaderClose").focus();
}

function closeReader() {
  const overlay = document.getElementById("luminaReaderOverlay");

  overlay.classList.remove("lumina-popup-open");
  overlay.setAttribute("aria-hidden", "true");

  activeReaderNoteId = null;

  /* The topic list stays open behind the reader. */
  if (activeSubject) {
    document.getElementById("luminaTopicsClose").focus();
  }
}

function openCreateModal() {
  editingNoteId = null;
  noteForm.reset();

  modalTitle.textContent = "Create a Note";
  saveNoteBtn.textContent = "Save Note";
  saveStatus.textContent = "";

  if (currentFilter) {
    noteSubject.value = currentFilter;
  } else if (activeSubject) {
    noteSubject.value = activeSubject;
  }

  modal.classList.add("show");
  noteTitle.focus();
}

function openEditModal(id) {
  const note = notes.find(item => item.id === id);
  if (!note) return;

  /* If the reader is open, close only the reader.
     The topic list remains behind the edit form. */
  if (activeReaderNoteId) {
    closeReader();
  }

  editingNoteId = id;
  noteTitle.value = note.title;
  noteSubject.value = note.subject;
  noteContent.value = note.content;

  modalTitle.textContent = "Edit Note";
  saveNoteBtn.textContent = "Save Changes";
  saveStatus.textContent = "";

  modal.classList.add("show");
  noteTitle.focus();
}

function closeModal() {
  modal.classList.remove("show");
  noteForm.reset();
  editingNoteId = null;
  saveStatus.textContent = "";
}

function deleteNote(id) {
  const note = notes.find(item => item.id === id);
  if (!note) return;

  if (!window.confirm(
    `Delete "${note.title}"? This cannot be undone.`
  )) {
    return;
  }

  notes = notes.filter(item => item.id !== id);

  if (activeReaderNoteId === id) {
    closeReader();
  }

  if (
    activeSubject &&
    !notes.some(item => item.subject === activeSubject)
  ) {
    closeTopicsModal();
  }

  saveNotes();
  render();

  if (activeSubject) {
    renderTopicsList();
  }
}

/* Existing Create Note and Edit Note form behaviour. */
noteForm.addEventListener("submit", event => {
  event.preventDefault();

  const title = noteTitle.value.trim();
  const subject = noteSubject.value.trim();
  const content = noteContent.value.trim();

  if (!title || !subject || !content) {
    saveStatus.textContent = "Please fill in all three fields.";
    return;
  }

  const now = new Date().toISOString();

  if (editingNoteId) {
    const index = notes.findIndex(
      note => note.id === editingNoteId
    );

    if (index === -1) return;

    notes[index] = {
      ...notes[index],
      title,
      subject,
      content,
      updatedAt: now
    };
  } else {
    notes.push({
      id: createId(),
      title,
      subject,
      content,
      source: "manual",
      createdAt: now,
      updatedAt: now
    });
  }

  const savedSubject = subject;

  if (saveNotes()) {
    closeModal();

    if (activeSubject && activeSubject !== savedSubject) {
      activeSubject = savedSubject;
      document.getElementById("luminaTopicsTitle").textContent =
        savedSubject;
    }

    render();

    if (activeSubject) {
      renderTopicsList();
    }
  }
});

/* Quick-add feature inside the subject popup. */
document.getElementById("luminaQuickAddToggle")
  .addEventListener("click", () => {
    quickAddVisible = !quickAddVisible;

    const form = document.getElementById("luminaQuickAddForm");
    const toggle = document.getElementById("luminaQuickAddToggle");

    form.classList.toggle("visible", quickAddVisible);
    toggle.textContent = quickAddVisible
      ? "− Cancel quick note"
      : "+ Add a quick note";

    if (quickAddVisible) {
      document.getElementById("luminaQuickAddInput").focus();
    }
  });

document.getElementById("luminaQuickAddForm")
  .addEventListener("submit", event => {
    event.preventDefault();

    const input = document.getElementById("luminaQuickAddInput");
    const content = input.value.trim();

    if (!content || !activeSubject) {
      input.focus();
      return;
    }

    const now = new Date().toISOString();

    notes.push({
      id: createId(),
      title: content.length > 45
        ? content.slice(0, 45).trim() + "..."
        : content,
      subject: activeSubject,
      content,
      source: "manual",
      createdAt: now,
      updatedAt: now
    });

    if (saveNotes()) {
      input.value = "";
      render();
      renderTopicsList();
      input.focus();
    }
  });

/* Popup close and navigation controls. */
document.getElementById("luminaTopicsClose")
  .addEventListener("click", closeTopicsModal);

document.getElementById("luminaReaderClose")
  .addEventListener("click", closeReader);

document.getElementById("luminaReaderBack")
  .addEventListener("click", closeReader);

document.getElementById("luminaReaderEdit")
  .addEventListener("click", () => {
    if (activeReaderNoteId) {
      openEditModal(activeReaderNoteId);
    }
  });

document.getElementById("luminaReaderDelete")
  .addEventListener("click", () => {
    if (activeReaderNoteId) {
      deleteNote(activeReaderNoteId);
    }
  });

document.getElementById("luminaTopicsOverlay")
  .addEventListener("click", event => {
    if (event.target.id === "luminaTopicsOverlay") {
      closeTopicsModal();
    }
  });

document.getElementById("luminaReaderOverlay")
  .addEventListener("click", event => {
    if (event.target.id === "luminaReaderOverlay") {
      closeReader();
    }
  });

document.getElementById("createNoteBtn")
  .addEventListener("click", openCreateModal);

document.getElementById("closeModalBtn")
  .addEventListener("click", closeModal);

document.getElementById("cancelModalBtn")
  .addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) {
    closeModal();
  }
});

/* Escape closes the topmost popup first. */
document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  const reader = document.getElementById("luminaReaderOverlay");
  const topics = document.getElementById("luminaTopicsOverlay");

  if (reader.classList.contains("lumina-popup-open")) {
    closeReader();
  } else if (modal.classList.contains("show")) {
    closeModal();
  } else if (topics.classList.contains("lumina-popup-open")) {
    closeTopicsModal();
  }
});

/* Existing search and subject filter. */
searchInput.addEventListener("input", event => {
  currentSearch = event.target.value;
  render();

  if (activeSubject) {
    renderTopicsList();
  }
});

subjectFilter.addEventListener("change", event => {
  currentFilter = event.target.value;
  render();

  if (activeSubject) {
    const subjectStillVisible = getFilteredNotes()
      .some(note => note.subject === activeSubject);

    if (subjectStillVisible) {
      renderTopicsList();
    } else {
      closeReader();
      closeTopicsModal();
    }
  }
});

/* Preserve the AI feature's existing note-saving connection. */
window.LuminaNotes = {
  save(noteData) {
    if (
      !noteData ||
      typeof noteData.title !== "string" ||
      typeof noteData.subject !== "string" ||
      typeof noteData.content !== "string"
    ) {
      return {
        success: false,
        message: "A title, subject and content are required."
      };
    }

    const title = noteData.title.trim();
    const subject = noteData.subject.trim();
    const content = noteData.content.trim();

    if (!title || !subject || !content) {
      return {
        success: false,
        message: "A title, subject and content are required."
      };
    }

    const allowedSources = ["manual", "ai-chat", "ai-summary"];
    const source = allowedSources.includes(noteData.source)
      ? noteData.source
      : "manual";

    const now = new Date().toISOString();

    const newNote = {
      id: createId(),
      title,
      subject,
      content,
      source,
      createdAt: now,
      updatedAt: now
    };

    try {
      const existing = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "[]"
      );

      if (!Array.isArray(existing)) {
        throw new Error("Stored notes are not in the expected format.");
      }

      existing.push(newNote);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(existing)
      );

      /* Keep the current page in sync when AI saves a note. */
      notes = loadNotes();
      render();

      if (activeSubject) {
        renderTopicsList();
      }

      return {
        success: true,
        message: "Note saved to Lumina My Notes."
      };
    } catch (error) {
      console.error("Unable to save AI note:", error);

      return {
        success: false,
        message: "The note could not be saved."
      };
    }
  }
};

addPopupStyles();
createPopupElements();
render();
