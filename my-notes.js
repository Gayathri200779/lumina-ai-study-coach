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
    typeof (note.title || note.topic) === "string" &&
    typeof note.content === "string";
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
      if (!Array.isArray(parsed)) return [];

      const normalized = parsed.filter(isValidNote).map(normalizeNote);

      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
      return normalized;
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

  const subjectOptions = document.getElementById("subjectOptions");

  if (subjectOptions) {
    subjectOptions.innerHTML = subjects.map(subject =>
      `<option value="${escapeHTML(subject)}"></option>`
    ).join("");
  }
}

/* =========================================
   FULL-SCREEN NOTE READER AND EDITOR
========================================= */

let noteReader = document.getElementById("noteReader");

function ensureNoteReader() {
  if (noteReader) return noteReader;

  noteReader = document.createElement("div");
  noteReader.id = "noteReader";
  noteReader.setAttribute("role", "dialog");
  noteReader.setAttribute("aria-modal", "true");
  noteReader.setAttribute("aria-labelledby", "noteReaderTitle");

  Object.assign(noteReader.style, {
    display: "none",
    position: "fixed",
    inset: "0",
    zIndex: "9999",
    background: "#eefdef",
    padding: "0",
    boxSizing: "border-box",
    alignItems: "stretch",
    justifyContent: "stretch"
  });

  const panel = document.createElement("section");
  panel.id = "noteReaderPanel";

  Object.assign(panel.style, {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    maxHeight: "100%",
    overflow: "hidden",
    background: "#FBFCFA",
    color: "#121e16",
    border: "0",
    borderRadius: "0",
    padding: "clamp(16px, 3vw, 32px)",
    boxSizing: "border-box",
    boxShadow: "none",
    fontFamily: "Poppins, sans-serif"
  });

  const close = document.createElement("button");
  close.type = "button";
  close.id = "noteReaderClose";
  close.textContent = "✕";
  close.setAttribute("aria-label", "Close note");

  Object.assign(close.style, {
    position: "sticky",
    top: "0",
    float: "right",
    alignSelf: "flex-end",
    flexShrink: "0",
    border: "0",
    borderRadius: "10px",
    width: "40px",
    height: "40px",
    background: "#e8f8ea",
    color: "#37563b",
    fontSize: "20px",
    cursor: "pointer"
  });

  close.addEventListener("click", closeNoteReader);

  const subject = document.createElement("p");
  subject.id = "noteReaderSubject";

  Object.assign(subject.style, {
    margin: "8px 50px 2px 0",
    color: "#4f6f52",
    fontWeight: "600",
    fontSize: "12px"
  });

  const title = document.createElement("h2");
  title.id = "noteReaderTitle";

  Object.assign(title.style, {
    margin: "0 50px 14px 0",
    color: "#37563b",
    fontSize: "clamp(16px, 2vw, 20px)",
    fontWeight: "600",
    lineHeight: "1.4",
    overflowWrap: "anywhere"
  });

  const content = document.createElement("div");
  content.id = "noteReaderContent";

  Object.assign(content.style, {
    flex: "1",
    minHeight: "0",
    width: "100%",
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: "16px",
    lineHeight: "1.9",
    color: "#25352a",
    padding: "18px 0",
    boxSizing: "border-box"
  });

  const footer = document.createElement("div");

  Object.assign(footer.style, {
    display: "flex",
    gap: "10px",
    justifyContent: "flex-end",
    flexWrap: "wrap",
    flexShrink: "0",
    marginTop: "10px",
    paddingTop: "14px",
    borderTop: "1px solid #d7e6d9"
  });

  const edit = document.createElement("button");
  edit.type = "button";
  edit.id = "noteReaderEdit";
  edit.textContent = "Edit Note";

  Object.assign(edit.style, {
    border: "0",
    borderRadius: "10px",
    padding: "11px 18px",
    background: "#4f6f52",
    color: "#fff",
    font: "inherit",
    fontWeight: "600",
    cursor: "pointer"
  });

  const done = document.createElement("button");
  done.type = "button";
  done.textContent = "Close";

  Object.assign(done.style, {
    border: "1px solid #cbdccb",
    borderRadius: "10px",
    padding: "11px 18px",
    background: "#fff",
    color: "#37563b",
    font: "inherit",
    cursor: "pointer"
  });

  done.addEventListener("click", closeNoteReader);

  footer.append(edit, done);
  panel.append(close, subject, title, content, footer);
  noteReader.appendChild(panel);

  noteReader.addEventListener("click", event => {
    if (event.target === noteReader) closeNoteReader();
  });

  document.body.appendChild(noteReader);

  return noteReader;
}

function openNoteReader(note, startInEditMode = false) {
  if (!note) return;

  ensureNoteReader();

  const subject = document.getElementById("noteReaderSubject");
  const title = document.getElementById("noteReaderTitle");
  const editButton = document.getElementById("noteReaderEdit");
  const closeButton = document.getElementById("noteReaderClose");

  subject.textContent = "📚 " + note.subject;
  title.textContent = note.title;

  function showReadMode(updatedNote) {
    subject.textContent = "📚 " + updatedNote.subject;
    title.textContent = updatedNote.title;

    const answer = document.createElement("div");
    answer.id = "noteReaderContent";
    answer.textContent = updatedNote.content;

    Object.assign(answer.style, {
      flex: "1",
      minHeight: "0",
      width: "100%",
      overflowY: "auto",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      fontSize: "16px",
      lineHeight: "1.9",
      color: "#25352a",
      padding: "18px 0",
      boxSizing: "border-box"
    });

    const currentContent = document.getElementById("noteReaderContent");

    if (currentContent) {
      currentContent.replaceWith(answer);
    }

    editButton.textContent = "Edit Note";
    editButton.onclick = () => openNoteReader(updatedNote, true);
  }

  function showEditMode(currentNote) {
    const currentContent = document.getElementById("noteReaderContent");

    if (!currentContent) return;

    const editor = document.createElement("textarea");
    editor.id = "noteReaderContent";
    editor.value = currentNote.content;
    editor.setAttribute("aria-label", "Edit note answer");
    editor.placeholder = "Edit your note here...";

    Object.assign(editor.style, {
      flex: "1",
      minHeight: "0",
      width: "100%",
      resize: "none",
      overflowY: "auto",
      padding: "18px",
      border: "1px solid #d7e6d9",
      borderRadius: "12px",
      background: "#ffffff",
      color: "#25352a",
      font: "inherit",
      fontSize: "16px",
      lineHeight: "1.9",
      outlineColor: "#4f6f52",
      boxSizing: "border-box"
    });

    currentContent.replaceWith(editor);

    editButton.textContent = "Save Edit";

    editButton.onclick = () => {
      const editedContent = editor.value.trim();

      if (!editedContent) {
        window.alert("Please enter the note answer before saving.");
        editor.focus();
        return;
      }

      // Ask for the title with the current title already filled in.
      const enteredTitle = window.prompt(
        "Enter or confirm the note title:",
        currentNote.title
      );

      if (enteredTitle === null) return;

      const editedTitle = enteredTitle.trim();

      if (!editedTitle) {
        window.alert("The note title cannot be empty.");
        return;
      }

      const index = notes.findIndex(item => item.id === currentNote.id);

      if (index === -1) {
        window.alert(
          "This note could not be found. Please reopen it and try again."
        );
        return;
      }

      const originalNote = notes[index];

      const updatedNote = {
        ...originalNote,
        title: editedTitle,
        content: editedContent,
        updatedAt: new Date().toISOString()
      };

      notes[index] = updatedNote;

      if (!saveNotes()) {
        notes[index] = originalNote;
        window.alert("Unable to save the note. Please try again.");
        return;
      }

      expandedSubject = updatedNote.subject;
      render();
      showReadMode(updatedNote);

      window.alert("Note updated successfully!");
    };

    editor.focus();
  }

  // Rebuild the answer area in read mode when opening a note.
  const oldContent = document.getElementById("noteReaderContent");

  if (oldContent) {
    const answer = document.createElement("div");
    answer.id = "noteReaderContent";
    answer.textContent = note.content;

    Object.assign(answer.style, {
      flex: "1",
      minHeight: "0",
      width: "100%",
      overflowY: "auto",
      whiteSpace: "pre-wrap",
      overflowWrap: "anywhere",
      fontSize: "16px",
      lineHeight: "1.9",
      color: "#25352a",
      padding: "18px 0",
      boxSizing: "border-box"
    });

    oldContent.replaceWith(answer);
  }

  editButton.textContent = "Edit Note";
  editButton.onclick = () => showEditMode(note);

  noteReader.style.display = "flex";
  document.body.style.overflow = "hidden";

  if (startInEditMode) {
    showEditMode(note);
  } else {
    closeButton.focus();
  }
}

function closeNoteReader() {
  if (noteReader) {
    noteReader.style.display = "none";
  }

  document.body.style.overflow = "";
}

/* =========================================
   DISPLAY SUBJECT CARDS AND TOPIC TITLES
========================================= */

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

          const title = document.createElement("span");
          title.className = "note-title";
          title.textContent = note.title;

          const body = document.createElement("p");
          body.className = "note-text";
          body.textContent = note.content;

          content.append(title, body);
          content.tabIndex = 0;
          content.setAttribute("role", "button");
          content.setAttribute(
            "aria-label",
            "Read full note: " + note.title
          );
          content.style.cursor = "pointer";

          content.addEventListener("click", () => openNoteReader(note));

          content.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openNoteReader(note);
            }
          });

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

          editButton.addEventListener("click", () => {
            openNoteReader(note, true);
          });

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

        // Quick note input inside each subject.
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

/* =========================================
   CREATE NOTE POPUP
========================================= */

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

/* =========================================
   DELETE NOTE
========================================= */

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

  if (saveNotes()) {
    render();
  }
}

/* =========================================
   CREATE AND SAVE NOTE FORM
========================================= */

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
    render();
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

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (noteReader && noteReader.style.display === "flex") {
      closeNoteReader();
    }

    if (modal.classList.contains("show")) {
      closeModal();
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

/* =========================================
   SAVE NOTES FROM AI PAGES
========================================= */

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

render();
