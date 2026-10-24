
const $ = id => document.getElementById(id);

const today = new Date();
const dateString = date =>
  `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
const todayString = dateString(today);

function load(key) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

let tasks = load("luminaStudyPlannerTasks");
let events = load("luminaStudyPlannerEvents");
let taskFilter = "all";
let eventFilter = "pending";
let editingTask = null;
let editingEvent = null;
let selectedDate = todayString;
let shownMonth = new Date(today.getFullYear(), today.getMonth(), 1);

function save() {
  localStorage.setItem("luminaStudyPlannerTasks", JSON.stringify(tasks));
  localStorage.setItem("luminaStudyPlannerEvents", JSON.stringify(events));
}

function id() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  })[char]);
}

function prettyDate(value) {
  if (!value) return "";
  return new Date(value + "T12:00:00").toLocaleDateString(undefined, {
    day:"numeric", month:"short", year:"numeric"
  });
}

function notify(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => $("toast").style.display = "none", 2200);
}

/* Study task form */
$("showTaskForm").onclick = () => openTaskForm();
$("cancelTask").onclick = () => closeTaskForm();

function openTaskForm(task = null) {
  editingTask = task ? task.id : null;
  $("taskForm").reset();
  $("taskTitle").value = task?.title || "";
  $("taskSubject").value = task?.subject || "";
  $("taskDate").value = task?.date || selectedDate || todayString;
  $("taskTime").value = task?.time || "";
  $("taskDuration").value = task?.duration || "";
  $("taskNotes").value = task?.notes || "";
  $("taskForm").classList.remove("hidden");
}

function closeTaskForm() {
  $("taskForm").classList.add("hidden");
  editingTask = null;
}

$("taskForm").addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    title: $("taskTitle").value.trim(),
    subject: $("taskSubject").value.trim(),
    date: $("taskDate").value,
    time: $("taskTime").value,
    duration: $("taskDuration").value,
    notes: $("taskNotes").value.trim()
  };

  if (!data.title || !data.date) return;

  if (editingTask) {
    const task = tasks.find(t => t.id === editingTask);
    if (task) Object.assign(task, data);
    notify("Task updated");
  } else {
    tasks.push({id:id(), ...data, completed:false});
    notify("Study task added");
  }

  selectedDate = data.date;
  shownMonth = new Date(data.date + "T12:00:00");
  save();
  closeTaskForm();
  renderAll();
});

function toggleTask(taskId, checked) {
  const task = tasks.find(t => t.id === taskId);
  if (!task) return;
  task.completed = checked;
  save();
  renderAll();
  notify(checked ? "Task completed! Well done 🌿" : "Task marked pending");
}

function deleteTask(taskId) {
  if (!confirm("Delete this study task?")) return;
  tasks = tasks.filter(t => t.id !== taskId);
  save();
  renderAll();
  notify("Task deleted");
}

$("taskFilters").addEventListener("click", e => {
  const button = e.target.closest("[data-filter]");
  if (!button) return;
  taskFilter = button.dataset.filter;
  $("taskFilters").querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b === button)
  );
  renderTasks();
});

function renderTasks() {
  let shown = tasks.filter(t =>
    taskFilter === "all" ||
    (taskFilter === "completed" ? t.completed : !t.completed)
  );

  shown.sort((a,b) => (a.date + a.time).localeCompare(b.date + b.time));

  $("taskList").innerHTML = shown.length ? shown.map(t => `
    <div class="item ${t.completed ? "completed" : ""}">
      <input type="checkbox" aria-label="Mark task complete"
        ${t.completed ? "checked" : ""}
        onchange="toggleTask('${t.id}', this.checked)">
      <div class="item-body">
        <div class="item-title">${safe(t.title)}</div>
        <div class="meta">${safe(t.subject || "General study")} · ${prettyDate(t.date)}${t.time ? " · " + safe(t.time) : ""}${t.duration ? " · " + safe(t.duration) + " min" : ""}</div>
        ${t.notes ? `<div class="notes">${safe(t.notes)}</div>` : ""}
        <div class="item-actions">
          <button class="secondary-btn" onclick="openTaskForm(tasks.find(t=>t.id==='${t.id}'))">Edit</button>
          <button class="delete-btn" onclick="deleteTask('${t.id}')">Delete</button>
        </div>
      </div>
    </div>
  `).join("") : `<div class="empty">No ${taskFilter === "all" ? "" : taskFilter + " "}study tasks yet.</div>`;
}

/* Academic reminder form */
$("showEventForm").onclick = () => openEventForm();
$("cancelEvent").onclick = () => closeEventForm();

function openEventForm(event = null) {
  editingEvent = event ? event.id : null;
  $("eventForm").reset();
  $("eventTitle").value = event?.title || "";
  $("eventType").value = event?.type || "Theory exam";
  $("eventDate").value = event?.date || selectedDate || todayString;
  $("eventTime").value = event?.time || "";
  $("eventSubject").value = event?.subject || "";
  $("eventNotes").value = event?.notes || "";
  $("eventForm").classList.remove("hidden");
}

function closeEventForm() {
  $("eventForm").classList.add("hidden");
  editingEvent = null;
}

$("eventForm").addEventListener("submit", e => {
  e.preventDefault();

  const data = {
    title: $("eventTitle").value.trim(),
    type: $("eventType").value,
    date: $("eventDate").value,
    time: $("eventTime").value,
    subject: $("eventSubject").value.trim(),
    notes: $("eventNotes").value.trim()
  };

  if (!data.title || !data.date) return;

  if (editingEvent) {
    const event = events.find(x => x.id === editingEvent);
    if (event) Object.assign(event, data);
    notify("Academic date updated");
  } else {
    events.push({id:id(), ...data, completed:false});
    notify("Academic reminder added");
  }

  selectedDate = data.date;
  shownMonth = new Date(data.date + "T12:00:00");
  save();
  closeEventForm();
  renderAll();
});

function toggleEvent(eventId, checked) {
  const event = events.find(x => x.id === eventId);
  if (!event) return;
  event.completed = checked;
  save();
  renderAll();
  notify(checked ? "Event completed" : "Event marked pending");
}

function deleteEvent(eventId) {
  if (!confirm("Delete this academic date?")) return;
  events = events.filter(x => x.id !== eventId);
  save();
  renderAll();
  notify("Academic date deleted");
}

$("eventFilters").addEventListener("click", e => {
  const button = e.target.closest("[data-filter]");
  if (!button) return;
  eventFilter = button.dataset.filter;
  $("eventFilters").querySelectorAll("button").forEach(b =>
    b.classList.toggle("active", b === button)
  );
  renderEvents();
});

function eventHTML(event) {
  return `
    <div class="item ${event.completed ? "completed" : ""}">
      <input type="checkbox" aria-label="Mark event complete"
        ${event.completed ? "checked" : ""}
        onchange="toggleEvent('${event.id}', this.checked)">
      <div class="item-body">
        <div class="item-title">${safe(event.title)}</div>
        <div class="meta">${safe(event.type)} · ${prettyDate(event.date)}${event.time ? " · " + safe(event.time) : ""}${event.subject ? " · " + safe(event.subject) : ""}</div>
        ${event.notes ? `<div class="notes">${safe(event.notes)}</div>` : ""}
        <div class="item-actions">
          <button class="secondary-btn" onclick="openEventForm(events.find(x=>x.id==='${event.id}'))">Edit</button>
          <button class="delete-btn" onclick="deleteEvent('${event.id}')">Delete</button>
        </div>
      </div>
    </div>`;
}

function renderEvents() {
  const shown = events.filter(e =>
    eventFilter === "all" ||
    (eventFilter === "completed" ? e.completed : !e.completed)
  ).sort((a,b) => (a.date+a.time).localeCompare(b.date+b.time));

  $("eventList").innerHTML = shown.length
    ? shown.map(eventHTML).join("")
    : `<div class="empty">No ${eventFilter} academic dates.</div>`;

  const daily = [
    ...events.filter(e => e.date === selectedDate),
    ...tasks.filter(t => t.date === selectedDate).map(t => ({
      ...t, type:"Study task", isTask:true
    }))
  ].sort((a,b) => (a.time || "").localeCompare(b.time || ""));

  $("selectedDateLabel").textContent = "Events for " + prettyDate(selectedDate);

  $("dayEvents").innerHTML = daily.length ? daily.map(item => `
    <div class="item ${item.completed ? "completed" : ""}">
      <input type="checkbox" aria-label="Mark complete"
        ${item.completed ? "checked" : ""}
        onchange="${item.isTask ? "toggleTask" : "toggleEvent"}('${item.id}', this.checked)">
      <div class="item-body">
        <div class="item-title">${safe(item.title)}</div>
        <div class="meta">${safe(item.type || item.subject || "Study task")}${item.time ? " · " + safe(item.time) : ""}</div>
      </div>
    </div>
  `).join("") : `<div class="empty">No tasks or academic events on this date.</div>`;
}

/* Calendar */
$("prevMonth").onclick = () => changeMonth(-1);
$("nextMonth").onclick = () => changeMonth(1);

function changeMonth(amount) {
  shownMonth = new Date(shownMonth.getFullYear(), shownMonth.getMonth()+amount, 1);
  renderCalendar();
}

function selectDay(date) {
  selectedDate = date;
  renderCalendar();
  renderEvents();
}

function renderCalendar() {
  const year = shownMonth.getFullYear();
  const month = shownMonth.getMonth();

  $("monthLabel").textContent = shownMonth.toLocaleDateString(undefined, {
    month:"long", year:"numeric"
  });

  const firstDay = new Date(year, month, 1).getDay();
  const start = new Date(year, month, 1-firstDay);
  const weekdays = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

  let html = weekdays.map(d => `<div class="weekday">${d}</div>`).join("");

  for (let i=0; i<42; i++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate()+i);
    const key = dateString(date);
    const dayEvents = events.filter(e => e.date === key);
    const dayTasks = tasks.filter(t => t.date === key);
    const items = [...dayEvents, ...dayTasks];

    const classes = ["day"];
    if (date.getMonth() !== month) classes.push("other");
    if (key === todayString) classes.push("today");
    if (key === selectedDate) classes.push("selected");

    const dots = items.slice(0,5).map(item => {
      let type = "";
      if (item.completed) type = "done";
      else if (item.type && item.type.toLowerCase().includes("exam")) type = "exam";
      else if (item.type && item.type.toLowerCase().includes("assignment")) type = "assignment";
      return `<span class="dot ${type}"></span>`;
    }).join("");

    html += `<button class="${classes.join(" ")}" onclick="selectDay('${key}')" aria-label="${prettyDate(key)}">
      <div class="day-num">${date.getDate()}</div>
      <div class="dots">${dots}</div>
    </button>`;
  }

  $("calendar").innerHTML = html;
}

/* Dashboard summary */
function renderStats() {
  const completed = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  $("totalTasks").textContent = total;
  $("completedTasks").textContent = completed;
  $("upcomingEvents").textContent =
    events.filter(e => !e.completed && e.date >= todayString).length;

  const percentage = total ? Math.round(completed / total * 100) : 0;
  $("completionPercent").textContent = percentage + "%";
  $("progressFill").style.width = percentage + "%";
}

function renderAll() {
  renderStats();
  renderTasks();
  renderEvents();
  renderCalendar();
}

renderAll();
