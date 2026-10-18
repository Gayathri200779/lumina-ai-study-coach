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
let activeReaderNoteId = null;
let toastTimer = null;

const subjectIcons = [
  "📘", "🧠", "📊", "🐍", "🧪",
  "🧮", "🌍", "💡", "🎨", "🧬", "📐"
];

function createId() {
  return window.crypto?.randomUUID?.() ||
    "note-" + Date.now() + "-" + Math.random().toString(36).slice(2);
}

function normalizeNote(note) {
  const now = new Date().toISOString();

  return {
    id: note.id || createId(),
    title: String(note.title || note.topic || "Untitled Note").trim(),
    subject: String(note.subject || note.subjectName || "General").trim() || "General",
    content: String(note.content || ""),
    source: ["manual", "ai-chat", "ai-summary"].includes(note.source)
      ? note.source
      : "manual",
    createdAt: note.createdAt || note.savedAt || now,
    updatedAt: note.updatedAt || note.savedAt || now
  };
}

function loadNotes() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved !== null) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed)
        ? parsed.filter(n => n && typeof n === "object" &&
            typeof n.content === "string").map(normalizeNote)
        : [];
    }

    if (localStorage.getItem(LEGACY_KEY) !== "true") {
      const examples = [
        {
          title: "Neural Networks",
          subject: "Artificial Intelligence",
          content: "Neural networks use connected nodes arranged in layers."
        },
        {
          title: "Supervised Learning",
          subject: "Artificial Intelligence",
          content: "Supervised learning uses labelled training data."
        },
        {
          title: "Standard Deviation",
          subject: "Statistics",
          content: "Standard deviation measures how spread out values are."
        },
        {
          title: "List Comprehensions",
          subject: "Python",
          content: "List comprehensions provide a concise way to create lists."
        }
      ].map(n => normalizeNote(n));

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

    if (saveStatus) {
      saveStatus.textContent = "Notes saved on this device.";
    }

    return true;
  } catch (error) {
    console.error("Unable to save notes:", error);

    if (saveStatus) {
      saveStatus.textContent = "Unable to save notes. Please try again.";
    }

    return false;
  }
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function getSubjectNames() {
  return [...new Set(notes.map(n => n.subject).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
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
  for (const char of subject) total += char.charCodeAt(0);

  return subjectIcons[total % subjectIcons.length];
}

function updateSubjectControls() {
  if (!subjectFilter) return;

  const selected = subjectFilter.value;
  const subjects = getSubjectNames();

  subjectFilter.innerHTML =
    '<option value="">All Subjects</option>' +
    subjects.map(s =>
      `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`
    ).join("");

  subjectFilter.value = subjects.includes(selected) ? selected : "";

  const subjectOptions = document.getElementById("subjectOptions");

  if (subjectOptions) {
    subjectOptions.innerHTML = subjects.map(s =>
      `<option value="${escapeHTML(s)}"></option>`
    ).join("");
  }
}

/* =========================================================
   LARGE FULL-SCREEN NOTE READER / EDITOR
   ========================================================= */

let noteReader = null;

function ensureNoteReader() {
  if (noteReader) return noteReader;

  noteReader = document.createElement("div");
  noteReader.id = "noteReader";
  noteReader.setAttribute("role", "dialog");
  noteReader.setAttribute("aria-modal", "true");
  noteReader.setAttribute("aria-labelledby", "noteReaderTitle");

  noteReader.innerHTML = `
    <section class="note-reader-panel">
      <button type="button" class="reader-close"
        id="noteReaderClose" aria-label="Close note">×</button>

      <div id="noteReaderToast" class="reader-toast" role="status"
        aria-live="polite" hidden></div>

      <div class="reader-heading">
        <p id="noteReaderSubject"></p>
        <h2 id="noteReaderTitle"></h2>
      </div>

      <div id="noteReaderContent" class="reader-content"></div>

      <div class="reader-footer">
        <button type="button" id="noteReaderEdit" class="reader-edit">
          Edit Note
        </button>
        <button type="button" id="noteReaderSave" class="reader-save"
          hidden>Save Edit</button>
        <button type="button" id="noteReaderCancel" class="reader-cancel"
          hidden>Cancel</button>
        <button type="button" id="noteReaderDone" class="reader-done">
          Close
        </button>
      </div>
    </section>
  `;

  document.body.appendChild(noteReader);

  noteReader.querySelector("#noteReaderClose")
    .addEventListener("click", closeNoteReader);

  noteReader.querySelector("#noteReaderDone")
    .addEventListener("click", closeNoteReader);

  noteReader.querySelector("#noteReaderEdit")
    .addEventListener("click", enterReaderEditMode);

  noteReader.querySelector("#noteReaderSave")
    .addEventListener("click", saveReaderEdit);

  noteReader.querySelector("#noteReaderCancel")
    .addEventListener("click", cancelReaderEdit);

  return noteReader;
}

function showReaderToast(message) {
  const toast = document.getElementById("noteReaderToast");
  if (!toast) return;

  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

function hideReaderToast() {
  const toast = document.getElementById("noteReaderToast");
  clearTimeout(toastTimer);
  if (toast) toast.hidden = true;
}

function openNoteReader(note, editMode = false) {
  if (!note) return;

  ensureNoteReader();
  activeReaderNoteId = note.id;

  document.getElementById("noteReaderSubject").textContent = note.subject;
  document.getElementById("noteReaderTitle").textContent = note.title;

  noteReader.style.display = "flex";
  document.body.classList.add("note-reader-open");

  setReaderMode(editMode);
}

function setReaderMode(editing) {
  const content = document.getElementById("noteReaderContent");
  const note = notes.find(n => n.id === activeReaderNoteId);

  document.getElementById("noteReaderEdit").hidden = editing;
  document.getElementById("noteReaderSave").hidden = !editing;
  document.getElementById("noteReaderCancel").hidden = !editing;
  document.getElementById("noteReaderDone").hidden = editing;

  content.classList.toggle("editing", editing);

  if (editing) {
    content.innerHTML = "";

    const textarea = document.createElement("textarea");
    textarea.id = "noteReaderTextarea";
    textarea.className = "reader-textarea";
    textarea.setAttribute("aria-label", "Edit note answer");
    textarea.value = note ? note.content : "";

    content.appendChild(textarea);
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  } else {
    content.textContent = note ? note.content : "";
    content.scrollTop = 0;
  }
}

function enterReaderEditMode() {
  hideReaderToast();
  setReaderMode(true);
}

function saveReaderEdit() {
  const note = notes.find(n => n.id === activeReaderNoteId);
  const textarea = document.getElementById("noteReaderTextarea");

  if (!note || !textarea) return;

  const newContent = textarea.value.trim();

  if (!newContent) {
    alert("The note answer cannot be empty.");
    textarea.focus();
    return;
  }

  // Ask for the title, with the current title pre-filled
  const newTitle = prompt("Enter or confirm the note title:", note.title);

  // User pressed Cancel on the prompt -> stay in edit mode, nothing saved
  if (newTitle === null) return;

  if (!newTitle.trim()) {
    alert("The note title cannot be empty.");
    return;
  }

  // Save both title and answer
  note.title = newTitle.trim();
  note.content = newContent;
  note.updatedAt = new Date().toISOString();

  if (!saveNotes()) {
    alert("Unable to save the note. Please try again.");
    return;
  }

  // Show updated title + answer
  render();
  openNoteReader(note, false);

  // Success message
  showReaderToast("✓ Note updated successfully!");
}

function cancelReaderEdit() {
  const note = notes.find(n => n.id === activeReaderNoteId);
  if (note) openNoteReader(note, false);
}

function closeNoteReader() {
  if (!noteReader) return;

  hideReaderToast();
  noteReader.style.display = "none";
  document.body.classList.remove("note-reader-open");
  activeReaderNoteId = null;
}

/* =========================================================
   SUBJECT CARDS AND NOTE TITLE LIST
   ========================================================= */

function render() {
  if (!grid) return;

  updateSubjectControls();
  grid.innerHTML = "";

  const filtered = notes.filter(note => {
    const matchesSearch =
      (note.title + " " + note.content + " " + note.subject)
        .toLowerCase().includes(currentSearch.toLowerCase());

    const matchesFilter =
      !currentFilter || note.subject === currentFilter;

    return matchesSearch && matchesFilter;
  });

  const grouped = new Map();

  filtered.forEach(note => {
    if (!grouped.has(note.subject)) grouped.set(note.subject, []);
    grouped.get(note.subject).push(note);
  });

  if (!grouped.size) {
    const empty = document.createElement("div");
    empty.className = "empty-notes";
    empty.textContent = currentSearch || currentFilter
      ? "No notes match your search."
      : "No notes yet. Create your first note.";
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
      header.setAttribute("aria-expanded",
        String(expandedSubject === subjectName));

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

          // Clickable TITLE only -> opens the large reading screen
          const noteButton = document.createElement("button");
          noteButton.type = "button";
          noteButton.className = "note-content";
          noteButton.setAttribute("aria-label", "Read note: " + note.title);

          const title = document.createElement("span");
          title.className = "note-title";
          title.textContent = note.title;
          noteButton.appendChild(title);

          noteButton.addEventListener("click", () => openNoteReader(note));

          if (note.source === "ai-chat" || note.source === "ai-summary") {
            const source = document.createElement("span");
            source.className = "note-source";
            source.textContent = note.source === "ai-chat"
              ? "✦ AI Chat Explanation"
              : "✦ AI Summary";
            noteButton.appendChild(source);
          }

          const actions = document.createElement("div");
          actions.className = "note-actions";

          const editButton = document.createElement("button");
          editButton.type = "button";
          editButton.className = "small-action";
          editButton.textContent = "Edit Note";
          editButton.addEventListener("click", () =>
            openNoteReader(note, true));

          const deleteButton = document.createElement("button");
          deleteButton.type = "button";
          deleteButton.className = "small-action delete";
          deleteButton.textContent = "Delete";
          deleteButton.addEventListener("click", () => deleteNote(note.id));

          actions.append(editButton, deleteButton);
          item.append(noteButton, actions);
          list.appendChild(item);
        });

        detail.appendChild(list);

        const quickAdd = document.createElement("div");
        quickAdd.className = "add-note-row";
        quickAdd.innerHTML = `
          <input class="add-note-input" type="text"
            maxlength="50000" placeholder="Write a quick note..."
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

          saveNotes();
          render();
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

/* =========================================================
   CREATE AND DELETE NOTES
   ========================================================= */

function openCreateModal() {
  if (!noteForm || !modal) return;

  editingNoteId = null;
  noteForm.reset();

  modalTitle.textContent = "Create a Note";
  saveNoteBtn.textContent = "Save Note";
  saveStatus.textContent = "";

  if (currentFilter) noteSubject.value = currentFilter;

  modal.classList.add("show");
  noteTitle.focus();
}

function closeModal() {
  if (!modal || !noteForm) return;

  modal.classList.remove("show");
  noteForm.reset();
  editingNoteId = null;

  if (saveStatus) saveStatus.textContent = "";
}

function deleteNote(id) {
  const note = notes.find(n => n.id === id);
  if (!note) return;

  if (!confirm(`Delete "${note.title}"? This cannot be undone.`)) return;

  notes = notes.filter(n => n.id !== id);

  if (activeReaderNoteId === id) closeNoteReader();

  if (!notes.some(n => n.subject === expandedSubject)) {
    expandedSubject = null;
  }

  saveNotes();
  render();
}

if (noteForm) {
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
      const index = notes.findIndex(n => n.id === editingNoteId);
      if (index < 0) return;

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

    if (saveNotes()) closeModal();

    render();
  });
}

document.getElementById("createNoteBtn")
  ?.addEventListener("click", openCreateModal);

document.getElementById("closeModalBtn")
  ?.addEventListener("click", closeModal);

document.getElementById("cancelModalBtn")
  ?.addEventListener("click", closeModal);

modal?.addEventListener("click", event => {
  if (event.target === modal) closeModal();
});

document.addEventListener("keydown", event => {
  if (event.key !== "Escape") return;

  // Reader open: Esc cancels editing first, then closes the reader
  if (noteReader && noteReader.style.display === "flex") {
    if (document.getElementById("noteReaderTextarea")) {
      cancelReaderEdit();
    } else {
      closeNoteReader();
    }
    return;
  }

  if (modal?.classList.contains("show")) closeModal();
});

searchInput?.addEventListener("input", event => {
  currentSearch = event.target.value;
  render();
});

subjectFilter?.addEventListener("change", event => {
  currentFilter = event.target.value;
  render();
});

/* AI PAGES CAN SAVE NOTES THROUGH window.LuminaNotes.save() */

window.LuminaNotes = {
  save(noteData) {
    if (!noteData ||
        typeof noteData.title !== "string" ||
        typeof noteData.subject !== "string" ||
        typeof noteData.content !== "string") {
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

    const now = new Date().toISOString();

    const newNote = {
      id: createId(),
      title,
      subject,
      content,
      source: ["manual", "ai-chat", "ai-summary"].includes(noteData.source)
        ? noteData.source
        : "manual",
      createdAt: now,
      updatedAt: now
    };

    try {
      const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");

      if (!Array.isArray(existing)) throw new Error("Invalid saved notes.");

      existing.push(newNote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

      notes = loadNotes();
      render();

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

render();
