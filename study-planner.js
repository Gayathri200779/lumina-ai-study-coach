
document.addEventListener("DOMContentLoaded", () => {
  const TASKS_KEY = "luminaStudyPlannerTasks";
  const EVENTS_KEY = "luminaStudyPlannerEvents";

  const $ = (id) => document.getElementById(id);

  const form = $("unifiedForm");
  const taskList = $("taskList");
  const taskFilter = $("taskFilter");
  const eventCategories = $("eventCategories");

  let tasks = loadData(TASKS_KEY);
  let events = loadData(EVENTS_KEY);

  // ---------- Storage ----------

  function loadData(key) {
    try {
      const data = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error("Could not save planner data:", error);
      alert("Could not save your changes. Please check your browser storage.");
    }
  }

  function createId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function parseLocalDate(value) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function todayAtMidnight() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  }

  function formatDate(value) {
    const date = parseLocalDate(value);

    if (!date) return "No date set";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  // ---------- Category handling ----------

  function normaliseEventType(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!cleaned) return "Other Events";

    const key = cleaned.toLowerCase();

    const standardCategories = {
      exam: "Exams",
      exams: "Exams",
      examination: "Exams",
      examinations: "Exams",

      assignment: "Assignments",
      assignments: "Assignments",

      project: "Projects",
      projects: "Projects",

      seminar: "Seminars",
      seminars: "Seminars",

      workshop: "Workshops",
      workshops: "Workshops",

      presentation: "Presentations",
      presentations: "Presentations",

      class: "Classes",
      classes: "Classes",
      lecture: "Classes",
      lectures: "Classes",

      deadline: "Deadlines",
      deadlines: "Deadlines",

      study: "Study",
      revision: "Revision",
      revisions: "Revision",

      other: "Other Events",
      "other event": "Other Events",
      "other events": "Other Events"
    };

    if (standardCategories[key]) {
      return standardCategories[key];
    }

    // Create a category for a new type.
    const words = cleaned.split(" ").map((word) => {
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

    let category = words.join(" ");

    if (/\b[^aeiou]y$/i.test(category)) {
      category = category.slice(0, -1) + "ies";
    } else if (!/(s|x|z|ch|sh)$/i.test(category)) {
      category += "s";
    }

    return category;
  }

  function getCategoryKey(category) {
    return String(category || "").trim().toLowerCase();
  }

  /*
    Study and Revision are shown in My Study Tasks.
    All other types are shown in My Academic Events.
    Both are added through the same form.
  */
  function isStudyTask(type) {
    const key = String(type || "").trim().toLowerCase();

    return [
      "study",
      "revision",
      "revisions"
    ].includes(key);
  }

  // ---------- Add everything through ONE form ----------

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("unifiedTitle").value.trim();
    const type = $("unifiedType").value.trim();
    const subject = $("unifiedSubject").value.trim();
    const date = $("unifiedDate").value;
    const description = $("unifiedDescription").value.trim();

    if (!title || !type || !date) {
      alert("Please enter the name, type and date.");
      return;
    }

    if (!parseLocalDate(date)) {
      alert("Please choose a valid date.");
      return;
    }

    if (isStudyTask(type)) {
      // Save a study or revision item as a task.
      tasks.unshift({
        id: createId(),
        title,
        subject,
        category: normaliseEventType(type),
        dueDate: date,
        description,
        completed: false,
        createdAt: new Date().toISOString()
      });

      saveData(TASKS_KEY, tasks);
      renderTasks();
    } else {
      // Save an assignment, exam, project or other type as an event.
      const category = normaliseEventType(type);

      events.push({
        id: createId(),
        title,
        eventType: type,
        category,
        subject,
        date,
        description,
        createdAt: new Date().toISOString()
      });

      saveData(EVENTS_KEY, events);
      renderEvents();
    }

    // Clear the form after successfully adding an item.
    form.reset();

    // Keep the user's attention on the section where the item appeared.
    if (isStudyTask(type)) {
      $("taskList").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    } else {
      $("eventCategories").scrollIntoView({
        behavior: "smooth",
        block: "nearest"
      });
    }
  });

  // ---------- Study tasks ----------

  function renderTasks() {
    const filter = taskFilter.value;

    const filteredTasks = tasks.filter((task) => {
      if (filter === "pending") return !task.completed;
      if (filter === "completed") return task.completed;
      return true;
    });

    $("totalTasks").textContent = tasks.length;

    const completedCount = tasks.filter(
      (task) => task.completed
    ).length;

    $("completedTasks").textContent = completedCount;
    $("pendingTasks").textContent = tasks.length - completedCount;

    const percentage = tasks.length
      ? Math.round((completedCount / tasks.length) * 100)
      : 0;

    $("progressPercent").textContent = percentage + "%";
    $("progressBar").style.width = percentage + "%";
    $("progressTrack").setAttribute("aria-valuenow", percentage);

    if (filteredTasks.length === 0) {
      taskList.innerHTML = `
        <div class="empty-state">
          ${
            tasks.length === 0
              ? "🌱 No study tasks yet. Add a Study or Revision item using the form above."
              : "No tasks match this filter."
          }
        </div>
      `;
      return;
    }

    filteredTasks.sort((a, b) => {
      return (a.dueDate || "9999-12-31")
        .localeCompare(b.dueDate || "9999-12-31");
    });

    taskList.innerHTML = filteredTasks.map((task) => {
      const dueDate = parseLocalDate(task.dueDate);
      const overdue = dueDate &&
        dueDate < todayAtMidnight() &&
        !task.completed;

      return `
        <article class="task-item ${task.completed ? "is-completed" : ""}">
          <input
            type="checkbox"
            class="task-checkbox"
            data-action="toggle-task"
            data-id="${escapeHTML(task.id)}"
            aria-label="Toggle task completion"
            ${task.completed ? "checked" : ""}
          >

          <div class="task-content">
            <div class="task-title-row">
              <h3 class="task-title">${escapeHTML(task.title)}</h3>

              <button
                type="button"
                class="delete-button"
                data-action="delete-task"
                data-id="${escapeHTML(task.id)}"
              >Delete</button>
            </div>

            ${
              task.description
                ? `<p class="task-description">${escapeHTML(task.description)}</p>`
                : ""
            }

            <div class="task-meta">
              ${
                task.subject
                  ? `<span class="meta-tag">📘 ${escapeHTML(task.subject)}</span>`
                  : ""
              }

              <span class="meta-tag">
                🏷️ ${escapeHTML(task.category || "Study")}
              </span>

              ${
                task.dueDate
                  ? `<span class="meta-tag ${overdue ? "overdue-tag" : ""}">
                      📅 ${overdue ? "Overdue · " : ""}${escapeHTML(formatDate(task.dueDate))}
                    </span>`
                  : ""
              }

              ${
                task.completed
                  ? `<span class="meta-tag">✓ Completed</span>`
                  : ""
              }
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  taskFilter.addEventListener("change", renderTasks);

  taskList.addEventListener("change", (event) => {
    const checkbox = event.target.closest(
      '[data-action="toggle-task"]'
    );

    if (!checkbox) return;

    const task = tasks.find(
      (item) => item.id === checkbox.dataset.id
    );

    if (!task) return;

    task.completed = checkbox.checked;
    saveData(TASKS_KEY, tasks);
    renderTasks();
  });

  taskList.addEventListener("click", (event) => {
    const button = event.target.closest(
      '[data-action="delete-task"]'
    );

    if (!button) return;

    const task = tasks.find(
      (item) => item.id === button.dataset.id
    );

    if (!task || !confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(
      (item) => item.id !== button.dataset.id
    );

    saveData(TASKS_KEY, tasks);
    renderTasks();
  });

  // ---------- Small calendar and date reminders ----------

  function renderSmallCalendar(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) {
      return `
        <div class="event-calendar">
          <span class="calendar-month">Date</span>
          <span class="calendar-day">—</span>
        </div>
      `;
    }

    const month = date.toLocaleDateString(undefined, {
      month: "short"
    });

    return `
      <div class="event-calendar" aria-label="${escapeHTML(formatDate(dateString))}">
        <span class="calendar-month">${escapeHTML(month)}</span>
        <span class="calendar-day">${date.getDate()}</span>
      </div>
    `;
  }

  function getDateReminder(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) return "";

    const difference = Math.round(
      (date.getTime() - todayAtMidnight().getTime()) /
      (24 * 60 * 60 * 1000)
    );

    if (difference < 0) return "";

    if (difference === 0) {
      return `<span class="event-reminder today">🔔 Today</span>`;
    }

    if (difference === 1) {
      return `<span class="event-reminder urgent">🔔 Tomorrow</span>`;
    }

    if (difference <= 7) {
      return `<span class="event-reminder urgent">🔔 In ${difference} days</span>`;
    }

    return "";
  }

  // ---------- Academic events grouped automatically ----------

  function renderEvents() {
    $("eventTotal").textContent =
      `${events.length} ${events.length === 1 ? "event" : "events"}`;

    if (events.length === 0) {
      eventCategories.innerHTML = `
        <div class="empty-state">
          📅 No academic events yet.<br>
          Add an assignment, exam, project or any event using the form above.
        </div>
      `;
      return;
    }

    const sortedEvents = [...events].sort((a, b) => {
      const dateA = a.date || "9999-12-31";
      const dateB = b.date || "9999-12-31";

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      return (a.title || "").localeCompare(b.title || "");
    });

    const groups = new Map();

    sortedEvents.forEach((item) => {
      const category = normaliseEventType(
        item.eventType || item.category || "Other"
      );

      const key = getCategoryKey(category);

      if (!groups.has(key)) {
        groups.set(key, {
          name: category,
          items: []
        });
      }

      groups.get(key).items.push(item);
    });

    eventCategories.innerHTML = [...groups.values()]
      .map((group) => {
        const cards = group.items.map((item) => `
          <article class="event-card">
            ${renderSmallCalendar(item.date)}

            <div class="event-content">
              <h4 class="event-title">${escapeHTML(item.title)}</h4>

              <div class="task-meta">
                <span class="event-type-label">
                  ${escapeHTML(normaliseEventType(item.eventType || item.category || "Other"))}
                </span>

                ${
                  item.subject
                    ? `<span class="meta-tag">📘 ${escapeHTML(item.subject)}</span>`
                    : ""
                }
              </div>

              ${
                item.description
                  ? `<p class="event-description">${escapeHTML(item.description)}</p>`
                  : ""
              }

              <p class="event-date-line">
                📅 ${escapeHTML(formatDate(item.date))}
              </p>

              ${getDateReminder(item.date)}
            </div>

            <button
              type="button"
              class="delete-button"
              data-action="delete-event"
              data-id="${escapeHTML(item.id)}"
            >Delete</button>
          </article>
        `).join("");

        return `
          <section class="event-category">
            <div class="category-heading">
              <h3>${escapeHTML(group.name)}</h3>
              <span class="category-count">${group.items.length}</span>
            </div>

            <div class="category-events">
              ${cards}
            </div>
          </section>
        `;
      }).join("");
  }

  eventCategories.addEventListener("click", (event) => {
    const button = event.target.closest(
      '[data-action="delete-event"]'
    );

    if (!button) return;

    const item = events.find(
      (eventItem) => eventItem.id === button.dataset.id
    );

    if (!item || !confirm(`Delete "${item.title}"?`)) return;

    events = events.filter(
      (eventItem) => eventItem.id !== button.dataset.id
    );

    saveData(EVENTS_KEY, events);
    renderEvents();
  });

  // ---------- Start the planner ----------

  renderTasks();
  renderEvents();
});
