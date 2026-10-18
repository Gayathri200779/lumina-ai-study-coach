
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
let expandedSubject = null;
let editingNoteId = null;
let currentSearch = "";
let currentFilter = "";

const subjectIcons = [
  "📘", "🧠", "📊", "🐍", "🧪",
  "🧮", "🌍", "💡", "🎨", "🧬", "📐"
];

/* Create the large note reader popup. */
function createReader() {
  if (document.getElementById("noteReaderModal")) return;

  const style = document.createElement("style");
  style.id = "noteReaderStyles";
  style.textContent = `
    #noteReaderModal {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(20, 35, 27, 0.60);
      padding: 20px;
      align-items: center;
      justify-content: center;
    }

    #noteReaderModal.show {
      display: flex;
    }

    #noteReaderModal .reader-panel {
      width: min(850px, 100%);
      max-height: 90vh;
      background: #FBFCFA;
      color: #26382C;
      border-radius: 18px;
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.22);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #noteReaderModal .reader-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 22px 26px;
      border-bottom: 1px solid #E1EAE3;
    }

    #noteReaderModal .reader-heading {
      min-width: 0;
    }

    #noteReaderModal .reader-heading h2 {
      margin: 0 0 8px;
      font-size: 23px;
      line-height: 1.4;
      overflow-wrap: anywhere;
    }

    #noteReaderModal .reader-subject {
      margin: 0;
      color: #6B9080;
      font-size: 14px;
    }

    #noteReaderModal .reader-close {
      flex-shrink: 0;
      border: 0;
      border-radius: 9px;
      background: #EEF5EF;
      color: #37563B;
      font-size: 24px;
      width: 40px;
      height: 40px;
      cursor: pointer;
    }

    #noteReaderModal .reader-close:hover {
      background: #DDEBE0;
    }

    #noteReaderModal .reader-body {
      padding: 26px;
      overflow-y: auto;
      font-size: 16px;
      line-height: 1.9;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }

    #noteReaderModal .reader-footer {
      padding: 14px 26px;
      border-top: 1px solid #E1EAE3;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }

    #noteReaderModal .reader-action {
      padding: 10px 17px;
      border: 1px solid #6B9080;
      border-radius: 9px;
      background: #6B9080;
      color: white;
      cursor: pointer;
      font: inherit;
    }

    #noteReaderModal .reader-action.secondary {
      background: transparent;
      color: #37563B;
    }

    .note-title-button {
      display: block;
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      color: #37563B;
      font: inherit;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
      overflow-wrap: anywhere;
    }

    .note-title-button:hover {
      color: #6B9080;
      text-decoration: underline;
    }

    .note-title-button:focus-visible {
      outline: 2px solid #6B9080;
      outline-offset: 4px;
      border-radius: 3px;
    }

    @media (max-width: 600px) {
      #noteReaderModal {
        padding: 10px;
      }

      #noteReaderModal .reader-panel {
        max-height: 94vh;
        border-radius: 14px;
      }

      #noteReaderModal .reader-header,
      #noteReaderModal .reader-body {
        padding: 18px;
      }

      #noteReaderModal .reader-heading h2 {
        font-size: 20px;
      }

      #noteReaderModal .reader-body {
        font-size: 15px;
      }

      #noteReaderModal .reader-footer {
        padding: 12px 18px;
      }
    }
  `;
  document.head.appendChild(style);

  const reader = document.createElement("div");
  reader.id = "noteReaderModal";
  reader.setAttribute("role", "dialog");
  reader.setAttribute("aria-modal", "true");
  reader.setAttribute("aria-labelledby", "readerNoteTitle");

  reader.innerHTML = `
    <section class="reader-panel">
      <header class="reader-header">
        <div class="reader-heading">
          <h2 id="readerNoteTitle"></h2>
          <p class="reader-subject" id="readerNoteSubject"></p>
        </div>
        <button type="button" class="reader-close"
                id="readerCloseBtn" aria-label="Close note">&times;</button>
      </header>

      <div class="reader-body" id="readerNoteContent"></div>

      <footer class="reader-footer">
        <button type="button" class="reader-action secondary"
                id="readerEditBtn">Edit Note</button>
        <button type="button" class="reader-action"
                id="readerDoneBtn">Close</button>
      </footer>
    </section>
  `;

  document.body.appendChild(reader);

  document.getElementById("readerCloseBtn")
    .addEventListener("click", closeReader);

  document.getElementById("readerDoneBtn")
    .addEventListener("click", closeReader);

  reader.addEventListener("click", event => {
    if (event.target === reader) closeReader();
  });

  document.getElementById("readerEditBtn")
    .addEventListener("click", () => {
      const id = reader.dataset.noteId;
      closeReader();
      if (id) openEditModal(id);
    });
}

function openReader(id) {
  const note = notes.find(item => item.id === id);
  if (!note) return;

  createReader();

  const reader = document.getElementById("noteReaderModal");
  document.getElementById("readerNoteTitle").textContent = note.title;
  document.getElementById("readerNoteSubject").textContent = note.subject;
  document.getElementById("readerNoteContent").textContent = note.content;
  reader.dataset.noteId = note.id;
  reader.classList.add("show");

  document.getElementById("readerCloseBtn").focus();
}

function closeReader() {
  const reader = document.getElementById("noteReaderModal");
  if (reader) reader.classList.remove("show");
}

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
      return Array.isArray(parsed) ? parsed.filter(isValidNote) : [];
    }

    if (localStorage.getItem(LEGACY_KEY) !== "true") {
      const examples = [
        {
          title: "Neural Networks",
          subject: "Artificial Intelligence",
          content: "Neural networks mimic brain structure using layers of nodes."
        },
        {
          title: "Supervised Learning",
          subject: "Artificial Intelligence",
          content: "Supervised learning requires labelled training data."
        },
        {
          title: "Reinforcement Learning",
          subject: "Artificial Intelligence",
          content: "Reinforcement learning improves actions using rewards."
        },
        {
          title: "Standard Deviation",
          subject: "Statistics",
          content: "Standard deviation measures how spread out values are."
        },
        {
          title: "P-values",
          subject: "Statistics",
          content: "A p-value helps evaluate evidence against a statistical hypothesis."
        },
        {
          title: "List Comprehensions",
          subject: "Python",
          content: "List comprehensions provide a concise way to create lists."
        },
        {
          title: "Virtual Environments",
          subject: "Python",
          content: "Virtual environments isolate project dependencies."
        },
        {
          title: "Decorators",
          subject: "Python",
          content: "Decorators modify or extend the behaviour of functions."
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

      localStorage.setItem(STORAGE_KEY, JSON.stringify(examples));
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    saveStatus.textContent = "Notes saved on this device.";
    return true;
  } catch (error) {
    console.error("Unable to save notes:", error);
    saveStatus.textContent = "Unable to save notes. Please try again.";
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
  return [...new Set(
    notes.map(note => note.subject.trim()).filter(Boolean)
  )].sort((a, b) => a.localeCompare(b));
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

function updateSubjectControls() {
  const selected = subjectFilter.value;
  const subjects = getSubjectNames();

  subjectFilter.innerHTML =
    '<option value="">All Subjects</option>' +
    subjects.map(subject =>
      `<option value="${escapeHTML(subject)}">${escapeHTML(subject)}</option>`
    ).join("");

  subjectFilter.value = subjects.includes(selected) ? selected : "";

  document.getElementById("subjectOptions").innerHTML =
    subjects.map(subject =>
      `<option value="${escapeHTML(subject)}"></option>`
    ).join("");
}

function render() {
  updateSubjectControls();

  const term = currentSearch.trim().toLowerCase();

  const filteredNotes = notes.filter(note => {
    const matchesSearch =
      note.title.toLowerCase().includes(term) ||
      note.subject.toLowerCase().includes(term) ||
      note.content.toLowerCase().includes(term);

    const matchesSubject =
      !currentFilter || note.subject === currentFilter;

    return matchesSearch && matchesSubject;
  });

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

      const header = document.createElement("div");
      header.className = "subject-header";
      header.tabIndex = 0;
      header.setAttribute("role", "button");
      header.setAttribute(
        "aria-expanded",
        String(expandedSubject === subjectName)
      );

      header.innerHTML = `
        <div class="subject-icon">${getIcon(subjectName)}</div>
        <div>
          <h3>${escapeHTML(subjectName)}</h3>
          <p class="note-count">
            ${subjectNotes.length}
            ${subjectNotes.length === 1 ? "Note" : "Notes"}
          </p>
        </div>
      `;

      function toggleSubject() {
        expandedSubject =
          expandedSubject === subjectName ? null : subjectName;
        render();
      }

      header.addEventListener("click", toggleSubject);

      header.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          toggleSubject();
        }
      });

      card.appendChild(header);

      if (expandedSubject === subjectName) {
        const detail = document.createElement("div");
        detail.className = "subject-detail";

        const list = document.createElement("ul");
        list.className = "notes-list";

        subjectNotes.forEach(note => {
          const item = document.createElement("li");
          item.className = "note-item";

          const content = document.createElement("div");
          content.className = "note-content";

          // Clicking the title opens the full note in the large reader.
          const title = document.createElement("button");
          title.type = "button";
          title.className = "note-title note-title-button";
          title.textContent = note.title;
          title.addEventListener("click", () => openReader(note.id));

          const body = document.createElement("p");
          body.className = "note-text";
          body.textContent = note.content;

          content.append(title, body);

          if (note.source === "ai-chat" || note.source === "ai-summary") {
            const source = document.createElement("span");
            source.className = "note-source";
            source.textContent = note.source === "ai-chat"
              ? "✦ AI Chat Explanation"
              : "✦ AI Summary";
            content.appendChild(source);
          }

          const actions = document.createElement("div");
          actions.className = "note-actions";

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "small-action";
          editButton.textContent = "Edit";
          editButton.addEventListener("click", () => openEditModal(note.id));

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "small-action delete";
          deleteButton.textContent = "✕";
          deleteButton.setAttribute("aria-label", "Delete " + note.title);
          deleteButton.addEventListener("click", () => deleteNote(note.id));

          actions.append(editButton, deleteButton);
          item.append(content, actions);
          list.appendChild(item);
        });

        detail.appendChild(list);

        const quickAdd = document.createElement("div");
        quickAdd.className = "add-note-row";
        quickAdd.innerHTML = `
          <input class="add-note-input" type="text"
                 maxlength="50000"
                 placeholder="Write a quick note..."
                 aria-label="Quick note content">
          <button class="add-note-btn" type="button">Add</button>
        `;

        const quickInput = quickAdd.querySelector("input");

        function addQuickNote() {
          const content = quickInput.value.trim();
          if (!content) {
            quickInput.focus();
            return;
          }

          const now = new Date().toISOString();

          notes.push({
            id: createId(),
            title: content.length > 45
              ? content.slice(0, 45).trim() + "..."
              : content,
            subject: subjectName,
            content,
            source: "manual",
            createdAt: now,
            updatedAt: now
          });

          if (saveNotes()) {
            render();
          }
        }

        quickAdd.querySelector("button")
          .addEventListener("click", addQuickNote);

        quickInput.addEventListener("keydown", event => {
          if (event.key === "Enter") {
            event.preventDefault();
            addQuickNote();
          }
        });

        detail.appendChild(quickAdd);
        card.appendChild(detail);
      }

      grid.appendChild(card);
    });
}

function openCreateModal() {
  editingNoteId = null;
  noteForm.reset();

  modalTitle.textContent = "Create a Note";
  saveNoteBtn.textContent = "Save Note";
  saveStatus.textContent = "";

  if (currentFilter) {
    noteSubject.value = currentFilter;
  }

  modal.classList.add("show");
  noteTitle.focus();
}

function openEditModal(id) {
  const note = notes.find(item => item.id === id);
  if (!note) return;

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

  if (!window.confirm(`Delete "${note.title}"? This cannot be undone.`)) {
    return;
  }

  notes = notes.filter(item => item.id !== id);

  if (!notes.some(item => item.subject === expandedSubject)) {
    expandedSubject = null;
  }

  saveNotes();
  render();
}

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
    const index = notes.findIndex(note => note.id === editingNoteId);
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

  expandedSubject = subject;

  if (saveNotes()) {
    closeModal();
  }

  render();
});

document.getElementById("createNoteBtn")
  .addEventListener("click", openCreateModal);

document.getElementById("closeModalBtn")
  .addEventListener("click", closeModal);

document.getElementById("cancelModalBtn")
  .addEventListener("click", closeModal);

modal.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (modal.classList.contains("show")) {
      closeModal();
    } else {
      closeReader();
    }
  }
});

searchInput.addEventListener("input", event => {
  currentSearch = event.target.value;
  render();
});

subjectFilter.addEventListener("change", event => {
  currentFilter = event.target.value;
  render();
});

/*
  Shared format for notes created by AI pages.
  AI explanations and summaries use the same subject-based collections.
*/
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

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

createReader();
render();
