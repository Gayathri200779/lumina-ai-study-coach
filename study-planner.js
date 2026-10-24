document.addEventListener("DOMContentLoaded", () => {
  const TASKS_KEY = "luminaStudyPlannerTasks";
  const EVENTS_KEY = "luminaStudyPlannerEvents";

  const $ = (id) => document.getElementById(id);

  const taskForm = $("taskForm");
  const taskList = $("taskList");
  const taskFilter = $("taskFilter");
  const eventForm = $("eventForm");
  const eventCategories = $("eventCategories");

  let tasks = loadData(TASKS_KEY);
  let events = loadData(EVENTS_KEY);

  // ---------- Storage ----------

  function loadData(key) {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch (error) {
      console.error("Could not read saved planner data:", error);
      return [];
    }
  }

  function saveData(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      alert("Your browser could not save the changes. Please check storage.");
      console.error("Could not save planner data:", error);
    }
  }

  function createId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2, 9);
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => {
      const replacements = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      return replacements[character];
    });
  }

  // Parse YYYY-MM-DD as a local date to avoid timezone shifts.
  function parseLocalDate(dateString) {
    if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return null;
    }

    const [year, month, day] = dateString.split("-").map(Number);
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

  function formatDate(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) return "No date set";

    return date.toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  }

  // ---------- Task management ----------

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
              ? "🌱 No study tasks yet. Add your first task above."
              : "No tasks match this filter."
          }
        </div>
      `;
      return;
    }

    taskList.innerHTML = filteredTasks.map((task) => {
      const dueDate = parseLocalDate(task.dueDate);
      const isOverdue = dueDate &&
        dueDate < todayAtMidnight() &&
        !task.completed;

      return `
        <article class="task-item ${task.completed ? "is-completed" : ""}">
          <input
            type="checkbox"
            class="task-checkbox"
            data-action="toggle-task"
            data-id="${escapeHTML(task.id)}"
            aria-label="Mark ${escapeHTML(task.title)} as ${
              task.completed ? "pending" : "completed"
            }"
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
                aria-label="Delete ${escapeHTML(task.title)}"
              >Delete</button>
            </div>

            ${
              task.description
                ? `<p class="task-description">${escapeHTML(task.description)}</p>`
                : ""
            }

            <div class="task-meta">
              ${task.subject
                ? `<span class="meta-tag">📘 ${escapeHTML(task.subject)}</span>`
                : ""
              }

              <span class="meta-tag">🏷️ ${escapeHTML(task.category || "Study")}</span>

              ${
                task.dueDate
                  ? `<span class="meta-tag ${isOverdue ? "overdue-tag" : ""}">
                      📅 ${isOverdue ? "Overdue · " : ""}${escapeHTML(formatDate(task.dueDate))}
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

  taskForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("taskTitle").value.trim();
    const subject = $("taskSubject").value.trim();
    const category = $("taskCategory").value;
    const dueDate = $("taskDueDate").value;
    const description = $("taskDescription").value.trim();

    if (!title || !subject) {
      alert("Please enter the task name and subject.");
      return;
    }

    tasks.unshift({
      id: createId(),
      title,
      subject,
      category,
      dueDate,
      description,
      completed: false,
      createdAt: new Date().toISOString()
    });

    saveData(TASKS_KEY, tasks);
    taskForm.reset();
    renderTasks();
  });

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

    if (!task) return;

    if (!confirm(`Delete "${task.title}"?`)) return;

    tasks = tasks.filter(
      (item) => item.id !== button.dataset.id
    );

    saveData(TASKS_KEY, tasks);
    renderTasks();
  });

  // ---------- Automatic event categorisation ----------

  /*
    Common event types get familiar category names.
    Any new type becomes its own category automatically.
    Capitalisation differences do not create duplicate categories.
  */

  function normaliseEventType(value) {
    const cleaned = String(value || "")
      .trim()
      .replace(/\s+/g, " ");

    if (!cleaned) return "";

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

      revision: "Revision",
      revisions: "Revision",

      other: "Other Events",
      "other event": "Other Events",
      "other events": "Other Events"
    };

    if (standardCategories[key]) {
      return standardCategories[key];
    }

    // Preserve a custom category, adding a plural where appropriate.
    const formatted = cleaned
      .split(" ")
      .map((word) => {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");

    if (/\b(s|x|z|ch|sh)$/i.test(formatted)) {
      return formatted;
    }

    if (/[^aeiou]y$/i.test(formatted)) {
      return formatted.slice(0, -1) + "ies";
    }

    return formatted + "s";
  }

  function getCategoryKey(category) {
    return String(category || "").trim().toLowerCase();
  }

  // ---------- Small event calendar indicators ----------

  function getDateReminder(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) return "";

    const difference = Math.round(
      (date.getTime() - todayAtMidnight().getTime()) /
      (24 * 60 * 60 * 1000)
    );

    if (difference < 0) {
      return "";
    }

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

  function renderSmallCalendar(dateString) {
    const date = parseLocalDate(dateString);

    if (!date) {
      return `
        <div class="event-calendar" aria-label="No date set">
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

  // ---------- Academic event management ----------

  function renderEvents() {
    $("eventTotal").textContent =
      `${events.length} ${events.length === 1 ? "event" : "events"}`;

    if (events.length === 0) {
      eventCategories.innerHTML = `
        <div class="empty-state">
          📅 No academic events added yet.<br>
          Add an exam, assignment, deadline or another event above.
        </div>
      `;
      return;
    }

    // Sort dated events from soonest to latest.
    const sortedEvents = [...events].sort((a, b) => {
      const dateA = a.date || "9999-12-31";
      const dateB = b.date || "9999-12-31";

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      return (a.title || "").localeCompare(b.title || "");
    });

    // Group items by category, creating a category for every new type.
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
        const cards = group.items.map((item) => {
          return `
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
                aria-label="Delete ${escapeHTML(item.title)}"
              >Delete</button>
            </article>
          `;
        }).join("");

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

  eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const title = $("eventTitle").value.trim();
    const eventType = $("eventType").value.trim();
    const subject = $("eventSubject").value.trim();
    const date = $("eventDate").value;
    const description = $("eventDescription").value.trim();

    if (!title || !eventType || !date) {
      alert("Please enter the event name, event type and date.");
      return;
    }

    if (!parseLocalDate(date)) {
      alert("Please choose a valid event date.");
      return;
    }

    events.push({
      id: createId(),
      title,
      eventType,
      category: normaliseEventType(eventType),
      subject,
      date,
      description,
      createdAt: new Date().toISOString()
    });

    saveData(EVENTS_KEY, events);
    eventForm.reset();
    renderEvents();
  });

  eventCategories.addEventListener("click", (event) => {
    const button = event.target.closest(
      '[data-action="delete-event"]'
    );

    if (!button) return;

    const item = events.find(
      (eventItem) => eventItem.id === button.dataset.id
    );

    if (!item) return;

    if (!confirm(`Delete "${item.title}"?`)) return;

    events = events.filter(
      (eventItem) => eventItem.id !== button.dataset.id
    );

    saveData(EVENTS_KEY, events);
    renderEvents();
  });

  // ---------- Initial display ----------

  renderTasks();
  renderEvents();
});
