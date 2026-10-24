
const NOTES_KEY = "luminaNotes";
const PROGRESS_KEY = "luminaSubjectProgress";
const QUESTIONS_KEY = "luminaSubjectQuestions";
const DB_NAME = "luminaSubjectMaterials";
const STORE_NAME = "files";

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(window.location.search);
const subject = params.get("subject") || "My Subject";

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

function renderNotes() {
  const notes = getNotes().filter(
    note => (note.subject || "").trim().toLowerCase() === subject.trim().toLowerCase()
  );

  $("notesList").innerHTML = "";
  $("notesEmpty").hidden = notes.length > 0;

  notes.forEach(note => {
    const card = document.createElement("article");
    card.className = "item-card";

    const title = document.createElement("h3");
    title.textContent = note.title || "Untitled note";

    const preview = document.createElement("p");
    preview.textContent = (note.content || "").slice(0, 180);

    const edit = document.createElement("button");
    edit.className = "primary-button";
    edit.textContent = "Edit Note";
    edit.type = "button";
    edit.addEventListener("click", () => {
      const newTitle = prompt("Edit note title:", note.title || "");
      if (newTitle === null) return;

      const newContent = prompt("Edit note content:", note.content || "");
      if (newContent === null) return;

      const updatedNotes = getNotes().map(item =>
        String(item.id) === String(note.id)
          ? {
              ...item,
              title: newTitle.trim() || "Untitled note",
              content: newContent,
              updatedAt: new Date().toISOString()
            }
          : item
      );

      localStorage.setItem(NOTES_KEY, JSON.stringify(updatedNotes));
      renderNotes();
      showStatus("Your note was updated.");
    });

    card.append(title, preview, edit);
    $("notesList").appendChild(card);
  });
}

function getProgress() {
  return readJSON(PROGRESS_KEY, {});
}

function renderProgress() {
  const progress = getProgress();
  const value = Number(progress[subject] || 0);
  $("progressInput").value = value;
  $("progressLabel").textContent = `${value}%`;
  $("progressBar").style.width = `${value}%`;
}

$("progressInput").addEventListener("input", () => {
  $("progressLabel").textContent = `${$("progressInput").value}%`;
  $("progressBar").style.width = `${$("progressInput").value}%`;
});

$("saveProgress").addEventListener("click", () => {
  const progress = getProgress();
  progress[subject] = Number($("progressInput").value);
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  showStatus("Subject progress saved.");
});

function renderQuestions() {
  const allQuestions = readJSON(QUESTIONS_KEY, {});
  const questions = allQuestions[subject] || [];

  $("questionsList").innerHTML = "";
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
      const latest = readJSON(QUESTIONS_KEY, {});
      latest[subject] = (latest[subject] || []).filter((_, i) => i !== index);
      localStorage.setItem(QUESTIONS_KEY, JSON.stringify(latest));
      renderQuestions();
      showStatus("Question deleted.");
    });

    li.append(text, document.createTextNode(" "), remove);
    $("questionsList").appendChild(li);
  });
}

$("questionForm").addEventListener("submit", event => {
  event.preventDefault();

  const question = $("questionInput").value.trim();
  if (!question) return;

  const allQuestions = readJSON(QUESTIONS_KEY, {});
  allQuestions[subject] = allQuestions[subject] || [];
  allQuestions[subject].push(question);

  localStorage.setItem(QUESTIONS_KEY, JSON.stringify(allQuestions));
  $("questionInput").value = "";
  renderQuestions();
  showStatus("Important question added.");
});

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
    request.onerror = () => reject(request.error);
  });
}

async function getMaterials() {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => {
      db.close();
      resolve(request.result.filter(file => file.subject === subject));
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
  try {
    const materials = await getMaterials();

    $("materialsList").innerHTML = "";
    $("materialsEmpty").hidden = materials.length > 0;

    materials.forEach(material => {
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
        link.click();
        URL.revokeObjectURL(url);
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "primary-button";
      remove.textContent = "Delete";
      remove.addEventListener("click", async () => {
        if (!confirm(`Delete ${material.name}?`)) return;
        await deleteMaterial(material.id);
        await renderMaterials();
        showStatus("Material deleted.");
      });

      card.append(title, info, download, remove);
      $("materialsList").appendChild(card);
    });
  } catch (error) {
    showStatus(error.message || "Could not load materials.");
  }
}

$("materialForm").addEventListener("submit", async event => {
  event.preventDefault();

  const file = $("materialFile").files[0];
  if (!file) return;

  try {
    await saveMaterial(file);
    $("materialFile").value = "";
    await renderMaterials();
    showStatus("Study material uploaded to this browser.");
  } catch (error) {
    showStatus(error.message || "Could not save this file.");
  }
});

function renderActivities() {
  const plannerKeys = [
    "luminaStudyPlannerItems",
    "luminaStudyPlannerTasks",
    "luminaStudyPlannerEvents"
  ];

  const activities = [];

  plannerKeys.forEach(key => {
    const data = readJSON(key, []);
    if (Array.isArray(data)) activities.push(...data);
  });

  const filtered = activities.filter(item =>
    (item.subject || "").trim().toLowerCase() === subject.trim().toLowerCase()
  );

  $("activitiesList").innerHTML = "";
  $("activitiesEmpty").hidden = filtered.length > 0;

  filtered.forEach(item => {
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
    $("activitiesList").appendChild(card);
  });
}

renderNotes();
renderProgress();
renderQuestions();
renderActivities();
renderMaterials();
