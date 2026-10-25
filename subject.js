
"use strict";

const NOTES_KEY = "luminaNotes";
const PROGRESS_KEY = "luminaSubjectProgress";
const QUESTIONS_KEY = "luminaSubjectQuestions";
const DB_NAME = "luminaSubjectMaterials";
const STORE_NAME = "files";

const $ = (id) => document.getElementById(id);

const params = new URLSearchParams(window.location.search);
const subject = (params.get("subject") || "My Subject").trim();

$("subjectTitle").textContent = subject;
$("subjectDescription").textContent =
  `Keep your ${subject} notes, materials, questions and progress organized.`;

document.title = `${subject} | Lumina AI Study Coach`;

/* -------------------------------
   General helpers
-------------------------------- */

function readJSON(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function showStatus(message) {
  $("pageStatus").textContent = message;
}

function normalise(value) {
  return String(value ?? "").trim().toLowerCase();
}

function getNotes() {
  const notes = readJSON(NOTES_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function getNoteContent(note) {
  const content =
    note.content ??
    note.text ??
    note.noteContent ??
    note.body ??
    "";

  // Preserve the saved text, line breaks and spacing.
  return typeof content === "string"
    ? content
    : String(content ?? "");
}

function getNoteUnit(note) {
  return String(
    note.unit ??
    note.unitName ??
    note.unitTitle ??
    ""
  ).trim();
}

function getNoteTitle(note) {
  return String(note.title || "Untitled note").trim();
}

/* -------------------------------
   Full note viewer
-------------------------------- */

function createNoteDialog() {
  const dialog = document.createElement("dialog");
  dialog.className = "note-dialog";
  dialog.setAttribute("aria-labelledby", "noteDialogTitle");

  const inner = document.createElement("div");
  inner.className = "note-dialog-inner";

  const header = document.createElement("div");
  header.className = "note-dialog-header";

  const title = document.createElement("h2");
  title.id = "noteDialogTitle";

  const unit = document.createElement("p");
  unit.className = "note-dialog-unit";

  const content = document.createElement("div");
  content.className = "note-dialog-content";

  const footer = document.createElement("div");
  footer.className = "note-dialog-footer";

  const close = document.createElement("button");
  close.type = "button";
  close.className = "primary-button";
  close.textContent = "Close";
  close.addEventListener("click", () => dialog.close());

  header.append(title, unit);
  footer.appendChild(close);
  inner.append(header, content, footer);
  dialog.appendChild(inner);
  document.body.appendChild(dialog);

  // Close when the user clicks the dark backdrop.
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  return { dialog, title, unit, content };
}

const noteViewer = createNoteDialog();

function openNote(note) {
  noteViewer.title.textContent = getNoteTitle(note);

  const unitName = getNoteUnit(note);

  noteViewer.unit.textContent = unitName
    ? unitName
    : "No unit assigned";

  // textContent safely displays the actual saved text.
  // Newlines and spaces are preserved by the CSS.
  noteViewer.content.textContent =
    getNoteContent(note) || "This note has no saved content.";

  if (typeof noteViewer.dialog.showModal === "function") {
    noteViewer.dialog.showModal();
  } else {
    // Fallback for older browsers.
    alert(
      `${getNoteTitle(note)}\n\n${getNoteContent(note)}`
    );
  }
}

/* -------------------------------
   Subject notes
-------------------------------- */

function renderNotes() {
  const allNotes = getNotes();

  const notes = allNotes.filter((note) =>
    normalise(note.subject) === normalise(subject)
  );

  const list = $("notesList");
  list.replaceChildren();

  $("notesEmpty").hidden = notes.length > 0;

  if (notes.length === 0) {
    return;
  }

  /*
   * Notes with a unit are grouped together.
   * Notes without a unit remain available under
   * "Other Notes"; unit selection is optional.
   */
  const groups = new Map();

  notes.forEach((note) => {
    const unit = getNoteUnit(note);
    const groupName = unit || "Other Notes";

    if (!groups.has(groupName)) {
      groups.set(groupName, []);
    }

    groups.get(groupName).push(note);
  });

  // Show numbered units first, then other named units,
  // and finally notes without a unit.
  const groupEntries = [...groups.entries()].sort(([a], [b]) => {
    if (a === "Other Notes") return 1;
    if (b === "Other Notes") return -1;

    const aNumber = a.match(/\d+/);
    const bNumber = b.match(/\d+/);

    if (aNumber && bNumber) {
      return Number(aNumber[0]) - Number(bNumber[0]);
    }

    if (aNumber) return -1;
    if (bNumber) return 1;

    return a.localeCompare(b);
  });

  groupEntries.forEach(([groupName, groupNotes]) => {
    const group = document.createElement("section");
    group.className = "unit-group";

    const heading = document.createElement("h3");
    heading.className = "unit-heading";
    heading.textContent =
      groupName === "Other Notes"
        ? "📄 Other Notes"
        : `📘 ${groupName}`;

    const noteList = document.createElement("div");
    noteList.className = "note-list";

    groupNotes.forEach((note) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-title-button";

      const icon = document.createElement("span");
      icon.className = "note-icon";
      icon.textContent = "📄";
      icon.setAttribute("aria-hidden", "true");

      const title = document.createElement("span");
      title.className = "note-title-text";
      title.textContent = getNoteTitle(note);

      const arrow = document.createElement("span");
      arrow.className = "note-open-icon";
      arrow.textContent = "›";
      arrow.setAttribute("aria-hidden", "true");

      button.append(icon, title, arrow);

      button.setAttribute(
        "aria-label",
        `Open note: ${getNoteTitle(note)}`
      );

      button.addEventListener("click", () => {
        openNote(note);
      });

      noteList.appendChild(button);
    });

    group.append(heading, noteList);
    list.appendChild(group);
  });
}

/* -------------------------------
   Subject progress
-------------------------------- */

function getProgress() {
  const data = readJSON(PROGRESS_KEY, {});
  return data && typeof data === "object" && !Array.isArray(data)
    ? data
    : {};
}

function clampProgress(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(0, Math.min(100, number));
}

function saveProgressValue(value, announce = false) {
  const progress = getProgress();
  const safeValue = clampProgress(value);

  progress[subject] = safeValue;

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    showStatus(
      announce
        ? "Subject progress saved."
        : `Progress updated to ${safeValue}%.`
    );
  } catch {
    showStatus("Could not save progress in this browser.");
  }
}

function updateProgressDisplay(value) {
  const safeValue = clampProgress(value);

  $("progressInput").value = safeValue;
  $("progressLabel").textContent = `${safeValue}%`;
  $("progressBar").style.width = `${safeValue}%`;
  $("progressTrack").setAttribute("aria-valuenow", safeValue);

  return safeValue;
}

function renderProgress() {
  const progress = getProgress();
  const value = clampProgress(progress[subject] ?? 0);

  updateProgressDisplay(value);
}

$("progressInput").addEventListener("input", () => {
  const value = updateProgressDisplay($("progressInput").value);

  // Save immediately, so the user does not have to
  // press the Save Progress button every time.
  saveProgressValue(value);
});

$("decreaseProgress").addEventListener("click", () => {
  const current = Number($("progressInput").value);
  const value = updateProgressDisplay(current - 5);
  saveProgressValue(value, true);
});

$("increaseProgress").addEventListener("click", () => {
  const current = Number($("progressInput").value);
  const value = updateProgressDisplay(current + 5);
  saveProgressValue(value, true);
});

$("saveProgress").addEventListener("click", () => {
  const value = updateProgressDisplay($("progressInput").value);
  saveProgressValue(value, true);
});

/* -------------------------------
   Important questions
-------------------------------- */

function getQuestions() {
  const data = readJSON(QUESTIONS_KEY, {});

  return data && typeof data === "object" && !Array.isArray(data)
    ? data
    : {};
}

function renderQuestions() {
  const allQuestions = getQuestions();
  const questions = Array.isArray(allQuestions[subject])
    ? allQuestions[subject]
    : [];

  const list = $("questionsList");
  list.replaceChildren();

  $("questionsEmpty").hidden = questions.length > 0;

  questions.forEach((question, index) => {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.textContent = question;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "primary-button";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      const latest = getQuestions();

      latest[subject] = (Array.isArray(latest[subject])
        ? latest[subject]
        : []
      ).filter((_, i) => i !== index);

      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(latest));

      renderQuestions();
      showStatus("Question deleted.");
    });

    li.append(text, document.createTextNode(" "), remove);
    list.appendChild(li);
  });
}

$("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const question = $("questionInput").value.trim();

  if (!question) {
    return;
  }

  const allQuestions = getQuestions();

  if (!Array.isArray(allQuestions[subject])) {
    allQuestions[subject] = [];
  }

  allQuestions[subject].push(question);

  try {
    localStorage.setItem(QUESTIONS_KEY, JSON.stringify(allQuestions));
    $("questionInput").value = "";
    renderQuestions();
    showStatus("Important question added.");
  } catch {
    showStatus("Could not save the question.");
  }
});

/* -------------------------------
   Study materials: IndexedDB
-------------------------------- */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support file storage."));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getMaterials() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      const materials = request.result.filter(
        (file) => normalise(file.subject) === normalise(subject)
      );

      db.close();
      resolve(materials);
    };

    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
}

async function saveMaterial(file) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");

    transaction.objectStore(STORE_NAME).put({
      id: `${subject}_${Date.now()}_${file.name}`,
      subject,
      name: file.name,
      type: file.type,
      size: file.size,
      file,
      createdAt: new Date().toISOString()
    });

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("File saving was cancelled."));
    };
  });
}

async function deleteMaterial(id) {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(id);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };

    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("File deletion was cancelled."));
    };
  });
}

async function renderMaterials() {
  const list = $("materialsList");
  list.replaceChildren();

  try {
    const materials = await getMaterials();

    $("materialsEmpty").hidden = materials.length > 0;

    materials.forEach((material) => {
      const card = document.createElement("article");
      card.className = "item-card";

      const title = document.createElement("h3");
      title.textContent = material.name;

      const info = document.createElement("p");
      info.textContent =
        `${(material.size / 1024).toFixed(1)} KB`;

      const download = document.createElement("button");
      download.type = "button";
      download.className = "primary-button";
      download.textContent = "Download";

      download.addEventListener("click", () => {
        const url = URL.createObjectURL(material.file);
        const link = document.createElement("a");

        link.href = url;
        link.download = material.name;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "primary-button";
      remove.textContent = "Delete";

      remove.addEventListener("click", async () => {
        if (!confirm(`Delete ${material.name}?`)) {
          return;
        }

        try {
          await deleteMaterial(material.id);
          await renderMaterials();
          showStatus("Material deleted.");
        } catch {
          showStatus("Could not delete this material.");
        }
      });

      card.append(title, info, download, remove);
      list.appendChild(card);
    });
  } catch (error) {
    $("materialsEmpty").hidden = false;
    $("materialsEmpty").textContent =
      "Could not load materials. Please check your browser storage.";
    showStatus(error.message || "Could not load materials.");
  }
}

$("materialForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const file = $("materialFile").files[0];

  if (!file) {
    return;
  }

  try {
    await saveMaterial(file);
    $("materialFile").value = "";
    await renderMaterials();
    showStatus("Study material saved in this browser.");
  } catch (error) {
    showStatus(error.message || "Could not save this file.");
  }
});

/* -------------------------------
   Study planner activities
-------------------------------- */

function renderActivities() {
  const plannerKeys = [
    "luminaStudyPlannerItems",
    "luminaStudyPlannerTasks",
    "luminaStudyPlannerEvents"
  ];

  const activities = [];

  plannerKeys.forEach((key) => {
    const data = readJSON(key, []);

    if (Array.isArray(data)) {
      activities.push(...data);
    }
  });

  const filtered = activities.filter(
    (item) => normalise(item.subject) === normalise(subject)
  );

  const list = $("activitiesList");
  list.replaceChildren();

  $("activitiesEmpty").hidden = filtered.length > 0;

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = item.title || item.task || "Study activity";

    const info = document.createElement("p");

    info.textContent = [
      item.category || item.type || "",
      item.date || "",
      item.completed ? "Completed" : ""
    ].filter(Boolean).join(" • ");

    card.append(title, info);
    list.appendChild(card);
  });
}

/* -------------------------------
   Refresh notes if changed elsewhere
-------------------------------- */

window.addEventListener("storage", (event) => {
  if (!event.key || event.key === NOTES_KEY) {
    renderNotes();
  }

  if (!event.key || event.key === PROGRESS_KEY) {
    renderProgress();
  }
});

/* -------------------------------
   Initialise the page
-------------------------------- */

renderNotes();
renderProgress();
renderQuestions();
renderActivities();
renderMaterials();
