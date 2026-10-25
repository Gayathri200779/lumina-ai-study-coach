
"use strict";

const NOTES_KEY = "luminaNotes";
const QUESTIONS_KEY = "luminaSubjectQuestions";
const DB_NAME = "luminaSubjectMaterials";
const STORE_NAME = "files";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const subject = params.get("subject") || "My Subject";

$("subjectTitle").textContent = subject;
$("subjectDescription").textContent =
  `Keep your ${subject} notes, materials, activities and important questions organized.`;
document.title = `${subject} | Lumina AI Study Coach`;

/* ---------- Shared helpers ---------- */

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
  return note.content ??
    note.noteContent ??
    note.text ??
    note.body ??
    "";
}

function matchesSubject(item) {
  return String(item.subject || "").trim().toLowerCase() ===
    subject.trim().toLowerCase();
}

/* ---------- Read complete note ---------- */

const noteReader = $("noteReader");

function openNote(note) {
  $("readerTitle").textContent = note.title || "Untitled note";
  $("readerSubject").textContent = note.subject || subject;
  $("readerContent").textContent =
    getNoteContent(note) || "This note has no content yet.";

  if (typeof noteReader.showModal === "function") {
    noteReader.showModal();
  } else {
    noteReader.setAttribute("open", "");
  }
}

$("closeNoteReader").addEventListener("click", () => {
  if (typeof noteReader.close === "function") {
    noteReader.close();
  } else {
    noteReader.removeAttribute("open");
  }
});

noteReader.addEventListener("click", (event) => {
  if (event.target === noteReader) {
    noteReader.close();
  }
});

function renderNotes() {
  const notes = getNotes().filter(matchesSubject);
  const list = $("notesList");

  list.innerHTML = "";
  $("notesEmpty").hidden = notes.length > 0;

  notes.forEach((note) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "item-card note-card";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const content = getNoteContent(note);
    const preview = document.createElement("p");
    preview.textContent = content
      ? content.slice(0, 150) + (content.length > 150 ? "…" : "")
      : "No note content available.";

    const hint = document.createElement("span");
    hint.className = "note-open-hint";
    hint.textContent = "Open full note →";

    card.append(title, preview, hint);
    card.addEventListener("click", () => openNote(note));

    list.appendChild(card);
  });
}

/* ---------- Important questions ---------- */

function getAllQuestions() {
  const data = readJSON(QUESTIONS_KEY, {});
  return data && typeof data === "object" && !Array.isArray(data)
    ? data
    : {};
}

function renderQuestions() {
  const allQuestions = getAllQuestions();
  const questions = Array.isArray(allQuestions[subject])
    ? allQuestions[subject]
    : [];

  const list = $("questionsList");
  list.innerHTML = "";
  $("questionsEmpty").hidden = questions.length > 0;

  questions.forEach((question, index) => {
    const li = document.createElement("li");

    const text = document.createElement("span");
    text.textContent = question;

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "primary-button delete-button";
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      if (!confirm("Delete this important question?")) return;

      const latest = getAllQuestions();
      const current = Array.isArray(latest[subject])
        ? latest[subject]
        : [];

      latest[subject] = current.filter((_, i) => i !== index);
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(latest));

      renderQuestions();
      showStatus("Question deleted.");
    });

    li.append(text, remove);
    list.appendChild(li);
  });
}

$("questionForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const question = $("questionInput").value.trim();
  if (!question) return;

  const allQuestions = getAllQuestions();

  if (!Array.isArray(allQuestions[subject])) {
    allQuestions[subject] = [];
  }

  allQuestions[subject].push(question);
  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(allQuestions));

  $("questionInput").value = "";
  renderQuestions();
  showStatus("Important question added.");
});

/* ---------- Study materials: IndexedDB ---------- */

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Your browser does not support local file storage."));
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
    request.onerror = () => reject(
      request.error || new Error("Could not open material storage.")
    );
  });
}

async function getMaterials() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      const files = Array.isArray(request.result) ? request.result : [];
      db.close();
      resolve(files.filter(file => file.subject === subject));
    };

    request.onerror = () => {
      db.close();
      reject(request.error || new Error("Could not read materials."));
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
      reject(transaction.error || new Error("Could not save the material."));
    };

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error("Material saving was cancelled."));
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
      reject(transaction.error || new Error("Could not delete the material."));
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
      info.textContent = `${(material.size / 1024).toFixed(1)} KB`;

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
      remove.className = "primary-button delete-button";
      remove.textContent = "Delete";

      remove.addEventListener("click", async () => {
        if (!confirm(`Delete "${material.name}"?`)) return;

        try {
          await deleteMaterial(material.id);
          await renderMaterials();
          showStatus("Material deleted.");
        } catch (error) {
          showStatus(error.message || "Could not delete this material.");
        }
      });

      const actions = document.createElement("div");
      actions.className = "material-actions";
      actions.append(download, remove);

      card.append(title, info, actions);
      list.appendChild(card);
    });
  } catch (error) {
    $("materialsEmpty").hidden = false;
    $("materialsEmpty").textContent =
      error.message || "Could not load materials.";
  }
}

$("materialForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const fileInput = $("materialFile");
  const file = fileInput.files[0];

  if (!file) {
    showStatus("Please choose a file first.");
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

/* ---------- Study Planner activities ---------- */

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

  // Avoid showing the same item more than once if it appears in multiple keys.
  const seen = new Set();

  const filtered = activities.filter((item) => {
    if (!matchesSubject(item)) return false;

    const identity = JSON.stringify([
      item.id ?? "",
      item.title ?? "",
      item.date ?? "",
      item.category ?? ""
    ]);

    if (seen.has(identity)) return false;
    seen.add(identity);
    return true;
  });

  const list = $("activitiesList");
  list.innerHTML = "";
  $("activitiesEmpty").hidden = filtered.length > 0;

  filtered.forEach((item) => {
    const card = document.createElement("article");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = item.title || item.name || "Study activity";

    const details = [
      item.category || "",
      item.date || "",
      item.completed ? "Completed" : ""
    ].filter(Boolean);

    const info = document.createElement("p");
    info.textContent = details.length
      ? details.join(" • ")
      : "Scheduled study activity";

    card.append(title, info);
    list.appendChild(card);
  });
}

/* ---------- Refresh when saved data changes ---------- */

window.addEventListener("storage", (event) => {
  if (!event.key || event.key === NOTES_KEY) renderNotes();

  if (
    !event.key ||
    event.key === "luminaStudyPlannerItems" ||
    event.key === "luminaStudyPlannerTasks" ||
    event.key === "luminaStudyPlannerEvents"
  ) {
    renderActivities();
  }

  if (!event.key || event.key === QUESTIONS_KEY) renderQuestions();
});

/* ---------- Initial page load ---------- */

renderNotes();
renderQuestions();
renderActivities();
renderMaterials();
