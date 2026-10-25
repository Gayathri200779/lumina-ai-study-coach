
"use strict";

const NOTES_KEY = "luminaNotes";
const PROGRESS_KEY = "luminaSubjectProgress";
const QUESTIONS_KEY = "luminaSubjectQuestions";
const DB_NAME = "luminaSubjectMaterials";
const STORE_NAME = "files";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const subject = params.get("subject") || "My Subject";

const reader = $("noteReader");
let currentNote = null;

$("subjectTitle").textContent = subject;
$("subjectDescription").textContent =
  `Keep your ${subject} notes, materials, questions and progress organized.`;
document.title = `${subject} | Lumina AI Study Coach`;

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

function getNotes() {
  const notes = readJSON(NOTES_KEY, []);
  return Array.isArray(notes) ? notes : [];
}

function getNoteContent(note) {
  return String(
    note.content ??
    note.text ??
    note.noteContent ??
    note.body ??
    ""
  );
}

function getNoteUnit(note) {
  return String(
    note.unit ??
    note.unitName ??
    note.unitTitle ??
    ""
  ).trim();
}

/* ---------------- FULL-SCREEN NOTE READER ---------------- */

function openNote(note) {
  currentNote = note;

  $("readerTitle").textContent = note.title || "Untitled note";
  $("readerUnit").textContent = getNoteUnit(note);
  $("readerUnit").hidden = !getNoteUnit(note);

  // textContent preserves the saved text and line breaks safely.
  $("noteReaderContent").textContent = getNoteContent(note);

  if (typeof reader.showModal === "function") {
    reader.showModal();
  } else {
    reader.setAttribute("open", "");
  }

  document.body.style.overflow = "hidden";
}

function closeNote() {
  if (reader.open && typeof reader.close === "function") {
    reader.close();
  } else {
    reader.removeAttribute("open");
  }

  document.body.style.overflow = "";
  currentNote = null;
}

$("closeNoteReader").addEventListener("click", closeNote);

reader.addEventListener("click", (event) => {
  if (event.target === reader) closeNote();
});

reader.addEventListener("close", () => {
  document.body.style.overflow = "";
  currentNote = null;
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && reader.open) {
    document.body.style.overflow = "";
  }
});

/* ---------------- MY STUDY NOTES ---------------- */

function renderNotes() {
  const notes = getNotes().filter((note) => {
    return String(note.subject || "").trim().toLowerCase() ===
      subject.trim().toLowerCase();
  });

  const list = $("notesList");
  list.innerHTML = "";
  $("notesEmpty").hidden = notes.length > 0;

  if (!notes.length) return;

  // Notes with a unit are grouped by that unit.
  // Notes without a unit remain visible under "Other Notes".
  const groups = new Map();

  notes.forEach((note) => {
    const unit = getNoteUnit(note) || "Other Notes";

    if (!groups.has(unit)) groups.set(unit, []);
    groups.get(unit).push(note);
  });

  groups.forEach((groupNotes, unit) => {
    const group = document.createElement("div");
    group.className = "note-group";

    if (unit !== "Other Notes") {
      const heading = document.createElement("h3");
      heading.className = "unit-heading";
      heading.textContent = unit;
      group.appendChild(heading);
    }

    groupNotes.forEach((note) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "note-title-button";

      const title = document.createElement("span");
      title.textContent = note.title || "Untitled note";

      const icon = document.createElement("span");
      icon.className = "open-icon";
      icon.textContent = "↗";
      icon.setAttribute("aria-hidden", "true");

      button.append(title, icon);
      button.addEventListener("click", () => openNote(note));

      group.appendChild(button);
    });

    list.appendChild(group);
  });
}

/* ---------------- SUBJECT PROGRESS ---------------- */

function getProgress() {
  const value = readJSON(PROGRESS_KEY, {});
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function clampProgress(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(100, number));
}

function updateProgressDisplay(value) {
  const progressValue = clampProgress(value);

  $("progressInput").value = progressValue;
  $("progressLabel").textContent = `${progressValue}%`;
  $("progressBar").style.width = `${progressValue}%`;
  $("progressTrack").setAttribute("aria-valuenow", progressValue);
}

function renderProgress() {
  const progress = getProgress();
  updateProgressDisplay(progress[subject] ?? 0);
}

function changeProgress(amount) {
  const current = Number($("progressInput").value) || 0;
  updateProgressDisplay(clampProgress(current + amount));
}

$("progressInput").addEventListener("input", () => {
  updateProgressDisplay($("progressInput").value);
});

$("decreaseProgress").addEventListener("click", () => {
  changeProgress(-5);
});

$("increaseProgress").addEventListener("click", () => {
  changeProgress(5);
});

$("saveProgress").addEventListener("click", () => {
  const progress = getProgress();
  progress[subject] = clampProgress($("progressInput").value);

  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    updateProgressDisplay(progress[subject]);
    showStatus("Subject progress saved.");
  } catch (error) {
    showStatus("Could not save progress in this browser.");
  }
});

/* ---------------- IMPORTANT QUESTIONS ---------------- */

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
  list.innerHTML = "";
  $("questionsEmpty").hidden = questions.length > 0;

  questions.forEach((question, index) => {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.textContent = String(question);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "primary-button";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      const latest = getQuestions();
      const latestQuestions = Array.isArray(latest[subject])
        ? latest[subject]
        : [];

      latest[subject] = latestQuestions.filter((_, i) => i !== index);

      try {
        localStorage.setItem(QUESTIONS_KEY, JSON.stringify(latest));
        renderQuestions();
        showStatus("Question deleted.");
      } catch {
        showStatus("Could not delete this question.");
      }
    });

    li.append(text, document.createElement("br"), remove);
    list.appendChild(li);
  });
}

$("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const question = $("questionInput").value.trim();
  if (!question) return;

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
    showStatus("Could not save this question.");
  }
});

/* ---------------- UPLOADED STUDY MATERIALS ---------------- */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("This browser does not support local file storage."));
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
      const files = request.result.filter((file) => file.subject === subject);
      db.close();
      resolve(files);
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
  });
}

async function renderMaterials() {
  const list = $("materialsList");
  list.innerHTML = "";

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
        `${(Number(material.size || 0) / 1024).toFixed(1)} KB`;

      const actions = document.createElement("div");
      actions.className = "item-actions";

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
      remove.className = "secondary-button";
      remove.textContent = "Delete";

      remove.addEventListener("click", async () => {
        if (!confirm(`Delete ${material.name}?`)) return;

        try {
          await deleteMaterial(material.id);
          await renderMaterials();
          showStatus("Material deleted.");
        } catch {
          showStatus("Could not delete this material.");
        }
      });

      actions.append(download, remove);
      card.append(title, info, actions);
      list.appendChild(card);
    });
  } catch (error) {
    $("materialsEmpty").hidden = false;
    $("materialsEmpty").textContent =
      error.message || "Could not load study materials.";
  }
}

$("materialForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const fileInput = $("materialFile");
  const file = fileInput.files[0];

  if (!file) {
    showStatus("Choose a file first.");
    return;
  }

  try {
    await saveMaterial(file);
    fileInput.value = "";
    await renderMaterials();
    showStatus("Study material uploaded to this browser.");
  } catch (error) {
    showStatus(error.message || "Could not save this file.");
  }
});

/* ---------------- STUDY PLANNER ACTIVITIES ---------------- */

function renderActivities() {
  const plannerKeys = [
    "luminaStudyPlannerItems",
    "luminaStudyPlannerTasks",
    "luminaStudyPlannerEvents"
  ];

  const activities = [];

  plannerKeys.forEach((key) => {
    const data = readJSON(key, []);
    if (Array.isArray(data)) activities.push(...data);
  });

  const filtered = activities.filter((item) => {
    return String(item.subject || "").trim().toLowerCase() ===
      subject.trim().toLowerCase();
  });

  const list = $("activitiesList");
  list.innerHTML = "";
  $("activitiesEmpty").hidden = filtered.length > 0;

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = item.title || "Study activity";

    const info = document.createElement("p");
    info.textContent = [
      item.category || "",
      item.date || "",
      item.completed ? "Completed" : ""
    ].filter(Boolean).join(" • ");

    card.append(title, info);
    list.appendChild(card);
  });
}

/* ---------------- REFRESH SAVED DATA ---------------- */

window.addEventListener("storage", (event) => {
  if (!event.key || event.key === NOTES_KEY) renderNotes();
  if (!event.key || event.key === PROGRESS_KEY) renderProgress();
  if (!event.key || event.key === QUESTIONS_KEY) renderQuestions();

  if (
    !event.key ||
    event.key === "luminaStudyPlannerItems" ||
    event.key === "luminaStudyPlannerTasks" ||
    event.key === "luminaStudyPlannerEvents"
  ) {
    renderActivities();
  }
});

renderNotes();
renderProgress();
renderQuestions();
renderActivities();
renderMaterials();
