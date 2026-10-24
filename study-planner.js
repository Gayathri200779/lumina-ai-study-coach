
/* ========================================
   LUMINA AI STUDY PLANNER
   File: study-planner.js
======================================== */

"use strict";

// Local storage keys
const TASKS_KEY = "luminaStudyPlannerTasks";
const EVENTS_KEY = "luminaStudyPlannerEvents";

// Get HTML elements
const taskForm = document.getElementById("taskForm");
const taskTitle = document.getElementById("taskTitle");
const taskSubject = document.getElementById("taskSubject");
const taskDate = document.getElementById("taskDate");
const taskPriority = document.getElementById("taskPriority");
const taskDuration = document.getElementById("taskDuration");
const taskNotes = document.getElementById("taskNotes");
const taskSubmitButton = document.getElementById("taskSubmitButton");
const cancelEditButton = document.getElementById("cancelEditButton");
const taskList = document.getElementById("taskList");
const taskFilter = document.getElementById("taskFilter");
const taskEmptyMessage = document.getElementById("taskEmptyMessage");

const totalTasksElement = document.getElementById("totalTasks");
const pendingTasksElement = document.getElementById("pendingTasks");
const completedTasksElement = document.getElementById("completedTasks");
const progressPercentElement = document.getElementById("progressPercent");
const progressLabel = document.getElementById("progressLabel");
const progressFill = document.getElementById("progressFill");

const previousMonthButton = document.getElementById("previousMonth");
const nextMonthButton = document.getElementById("nextMonth");
const calendarMonth = document.getElementById("calendarMonth");
const calendarDays = document.getElementById("calendarDays");
const selectedDateLabel = document.getElementById("selectedDateLabel");

const eventForm = document.getElementById("eventForm");
const eventTitle = document.getElementById("eventTitle");
const eventType = document.getElementById("eventType");
const eventDate = document.getElementById("eventDate");
const eventNotes = document.getElementById("eventNotes");
const eventSubmitButton = document.getElementById("eventSubmitButton");
const cancelEventEditButton = document.getElementById("cancelEventEditButton");
const eventFormHeading = document.getElementById("eventFormHeading");
const eventList = document.getElementById("eventList");
const eventEmptyMessage = document.getElementById("eventEmptyMessage");

// Get today's date in local time
function getLocalDateString(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

// Display dates in a readable format
function formatDate(dateString) {
    if (!dateString) return "";

    const parts = dateString.split("-");

    if (parts.length !== 3) return dateString;

    const date = new Date(
        Number(parts[0]),
        Number(parts[1]) - 1,
        Number(parts[2])
    );

    return date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

// Read saved data safely
function loadData(key) {
    try {
        const savedData = localStorage.getItem(key);

        if (!savedData) return [];

        const parsedData = JSON.parse(savedData);

        return Array.isArray(parsedData) ? parsedData : [];
    } catch (error) {
        console.error("Could not load planner data:", error);
        return [];
    }
}

// Save data
function saveData(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error("Could not save planner data:", error);
        alert("Your browser could not save this change. Please check your browser storage settings.");
    }
}

// Planner data
let tasks = loadData(TASKS_KEY);
let events = loadData(EVENTS_KEY);

let editingTaskId = null;
let editingEventId = null;

const today = getLocalDateString();

let selectedDate = today;

const initialDate = new Date();
let visibleMonth = initialDate.getMonth();
let visibleYear = initialDate.getFullYear();

// Generate a unique ID
function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
        return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Safely create text elements
function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    element.textContent = text;

    return element;
}

// ========================================
// STUDY TASKS
// ========================================

// Add or update a task
taskForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = taskTitle.value.trim();

    if (!title) {
        alert("Please enter a task name.");
        taskTitle.focus();
        return;
    }

    if (!taskDate.value) {
        alert("Please select a due date.");
        taskDate.focus();
        return;
    }

    const taskData = {
        title: title,
        subject: taskSubject.value.trim(),
        date: taskDate.value,
        priority: taskPriority.value,
        duration: taskDuration.value,
        notes: taskNotes.value.trim()
    };

    if (editingTaskId !== null) {
        tasks = tasks.map(function (task) {
            if (task.id === editingTaskId) {
                return {
                    ...task,
                    ...taskData
                };
            }

            return task;
        });
    } else {
        tasks.push({
            id: createId(),
            ...taskData,
            completed: false,
            createdAt: new Date().toISOString()
        });
    }

    saveData(TASKS_KEY, tasks);

    resetTaskForm();
    renderTasks();
    updateStatistics();
});

function resetTaskForm() {
    taskForm.reset();

    taskDate.value = getLocalDateString();
    taskPriority.value = "Medium";
    taskDuration.value = "30 minutes";

    editingTaskId = null;

    taskSubmitButton.textContent = "+ Add Study Task";
    cancelEditButton.classList.add("hidden");
}

cancelEditButton.addEventListener("click", resetTaskForm);

// Display tasks
function renderTasks() {
    taskList.replaceChildren();

    const filterValue = taskFilter.value;

    const filteredTasks = tasks.filter(function (task) {
        if (filterValue === "pending") {
            return !task.completed;
        }

        if (filterValue === "completed") {
            return task.completed;
        }

        return true;
    });

    // Sort pending tasks first, then by due date
    filteredTasks.sort(function (a, b) {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }

        return (a.date || "").localeCompare(b.date || "");
    });

    taskEmptyMessage.classList.toggle(
        "hidden",
        filteredTasks.length > 0
    );

    if (filteredTasks.length === 0) {
        if (tasks.length > 0 && filterValue !== "all") {
            taskEmptyMessage.textContent =
                filterValue === "pending"
                    ? "🎉 No pending tasks. Great work!"
                    : "No completed tasks yet. Keep going!";
        } else {
            taskEmptyMessage.textContent =
                "🌱 No study tasks yet. Add your first task above!";
        }
    }

    filteredTasks.forEach(function (task) {
        const taskItem = createElement(
            "article",
            `task-item${task.completed ? " is-completed" : ""}`
        );

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "task-checkbox";
        checkbox.checked = Boolean(task.completed);
        checkbox.setAttribute(
            "aria-label",
            `Mark ${task.title} as ${task.completed ? "pending" : "completed"}`
        );

        checkbox.addEventListener("change", function () {
            toggleTask(task.id, checkbox.checked);
        });

        const content = createElement("div", "task-content");

        const title = createElement("h4", "task-title", task.title);
        content.appendChild(title);

        const meta = createElement("div", "task-meta");

        if (task.subject) {
            meta.appendChild(
                createElement("span", "", `📘 ${task.subject}`)
            );
        }

        meta.appendChild(
            createElement("span", "", `📅 ${formatDate(task.date)}`)
        );

        meta.appendChild(
            createElement("span", "", `⏱ ${task.duration}`)
        );

        const priorityClass = {
            High: "priority-high",
            Medium: "priority-medium",
            Low: "priority-low"
        }[task.priority] || "priority-medium";

        const priority = createElement(
            "span",
            `priority ${priorityClass}`,
            task.priority || "Medium"
        );

        meta.appendChild(priority);
        content.appendChild(meta);

        if (task.notes) {
            content.appendChild(
                createElement("p", "task-notes", task.notes)
            );
        }

        const actions = createElement("div", "task-actions");

        const editButton = createElement("button", "small-action", "✎");
        editButton.type = "button";
        editButton.title = "Edit task";
        editButton.setAttribute("aria-label", `Edit ${task.title}`);

        editButton.addEventListener("click", function () {
            editTask(task.id);
        });

        const deleteButton = createElement(
            "button",
            "small-action delete",
            "×"
        );

        deleteButton.type = "button";
        deleteButton.title = "Delete task";
        deleteButton.setAttribute("aria-label", `Delete ${task.title}`);

        deleteButton.addEventListener("click", function () {
            deleteTask(task.id);
        });

        actions.append(editButton, deleteButton);
        taskItem.append(checkbox, content, actions);
        taskList.appendChild(taskItem);
    });
}

// Mark task as completed or pending
function toggleTask(id, completed) {
    tasks = tasks.map(function (task) {
        if (task.id === id) {
            return {
                ...task,
                completed: completed
            };
        }

        return task;
    });

    saveData(TASKS_KEY, tasks);
    renderTasks();
    updateStatistics();
}

// Edit a task
function editTask(id) {
    const task = tasks.find(function (item) {
        return item.id === id;
    });

    if (!task) return;

    editingTaskId = id;

    taskTitle.value = task.title || "";
    taskSubject.value = task.subject || "";
    taskDate.value = task.date || getLocalDateString();
    taskPriority.value = task.priority || "Medium";
    taskDuration.value = task.duration || "30 minutes";
    taskNotes.value = task.notes || "";

    taskSubmitButton.textContent = "Save Changes";
    cancelEditButton.classList.remove("hidden");

    taskForm.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });

    taskTitle.focus();
}

// Delete a task
function deleteTask(id) {
    const task = tasks.find(function (item) {
        return item.id === id;
    });

    if (!task) return;

    const confirmed = confirm(
        `Delete the task "${task.title}"?`
    );

    if (!confirmed) return;

    tasks = tasks.filter(function (item) {
        return item.id !== id;
    });

    if (editingTaskId === id) {
        resetTaskForm();
    }

    saveData(TASKS_KEY, tasks);
    renderTasks();
    updateStatistics();
}

// Filter tasks
taskFilter.addEventListener("change", renderTasks);

// ========================================
// PROGRESS STATISTICS
// ========================================

function updateStatistics() {
    const total = tasks.length;

    const completed = tasks.filter(function (task) {
        return task.completed;
    }).length;

    const pending = total - completed;

    const percentage = total === 0
        ? 0
        : Math.round((completed / total) * 100);

    totalTasksElement.textContent = total;
    pendingTasksElement.textContent = pending;
    completedTasksElement.textContent = completed;
    progressPercentElement.textContent = `${percentage}%`;
    progressLabel.textContent = `${percentage}% completed`;
    progressFill.style.width = `${percentage}%`;
    progressFill.setAttribute("aria-valuenow", percentage);
}

// ========================================
// ACADEMIC CALENDAR
// ========================================

// Change month
previousMonthButton.addEventListener("click", function () {
    visibleMonth--;

    if (visibleMonth < 0) {
        visibleMonth = 11;
        visibleYear--;
    }

    renderCalendar();
});

nextMonthButton.addEventListener("click", function () {
    visibleMonth++;

    if (visibleMonth > 11) {
        visibleMonth = 0;
        visibleYear++;
    }

    renderCalendar();
});

// Draw calendar
function renderCalendar() {
    calendarDays.replaceChildren();

    const monthDate = new Date(visibleYear, visibleMonth, 1);

    calendarMonth.textContent = monthDate.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric"
    });

    const firstDay = new Date(
        visibleYear,
        visibleMonth,
        1
    ).getDay();

    const daysInMonth = new Date(
        visibleYear,
        visibleMonth + 1,
        0
    ).getDate();

    const daysInPreviousMonth = new Date(
        visibleYear,
        visibleMonth,
        0
    ).getDate();

    // Show six rows to keep the calendar height consistent
    for (let cell = 0; cell < 42; cell++) {
        let dayNumber;
        let dateObject;
        let outsideMonth = false;

        if (cell < firstDay) {
            dayNumber = daysInPreviousMonth - firstDay + cell + 1;

            dateObject = new Date(
                visibleYear,
                visibleMonth - 1,
                dayNumber
            );

            outsideMonth = true;
        } else if (cell >= firstDay + daysInMonth) {
            dayNumber = cell - firstDay - daysInMonth + 1;

            dateObject = new Date(
                visibleYear,
                visibleMonth + 1,
                dayNumber
            );

            outsideMonth = true;
        } else {
            dayNumber = cell - firstDay + 1;

            dateObject = new Date(
                visibleYear,
                visibleMonth,
                dayNumber
            );
        }

        const dateString = getLocalDateString(dateObject);

        const dayButton = createElement(
            "button",
            "calendar-day",
            String(dayNumber)
        );

        dayButton.type = "button";
        dayButton.setAttribute("aria-label", formatDate(dateString));

        if (outsideMonth) {
            dayButton.classList.add("outside-month");
        }

        if (dateString === today) {
            dayButton.classList.add("is-today");
        }

        if (dateString === selectedDate) {
            dayButton.classList.add("is-selected");
        }

        const hasEvent = events.some(function (item) {
            return item.date === dateString;
        });

        if (hasEvent) {
            dayButton.classList.add("has-event");
        }

        dayButton.addEventListener("click", function () {
            selectedDate = dateString;

            visibleMonth = dateObject.getMonth();
            visibleYear = dateObject.getFullYear();

            eventDate.value = selectedDate;

            renderCalendar();
            renderEvents();
        });

        calendarDays.appendChild(dayButton);
    }
}

// ========================================
// ACADEMIC EVENTS
// ========================================

// Add or update event
eventForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const title = eventTitle.value.trim();

    if (!title) {
        alert("Please enter an event name.");
        eventTitle.focus();
        return;
    }

    if (!eventDate.value) {
        alert("Please select an event date.");
        eventDate.focus();
        return;
    }

    const eventData = {
        title: title,
        type: eventType.value,
        date: eventDate.value,
        notes: eventNotes.value.trim()
    };

    if (editingEventId !== null) {
        events = events.map(function (item) {
            if (item.id === editingEventId) {
                return {
                    ...item,
                    ...eventData
                };
            }

            return item;
        });
    } else {
        events.push({
            id: createId(),
            ...eventData,
            createdAt: new Date().toISOString()
        });
    }

    selectedDate = eventDate.value;

    const selected = selectedDate.split("-");

    visibleYear = Number(selected[0]);
    visibleMonth = Number(selected[1]) - 1;

    saveData(EVENTS_KEY, events);

    resetEventForm();
    renderCalendar();
    renderEvents();
});

function resetEventForm() {
    eventForm.reset();

    editingEventId = null;

    eventFormHeading.textContent = "Add Academic Event";
    eventSubmitButton.textContent = "+ Add Event";
    cancelEventEditButton.classList.add("hidden");

    eventDate.value = selectedDate;
}

cancelEventEditButton.addEventListener("click", resetEventForm);

// Display events for selected date
function renderEvents() {
    eventList.replaceChildren();

    selectedDateLabel.textContent = formatDate(selectedDate);

    const selectedEvents = events
        .filter(function (item) {
            return item.date === selectedDate;
        })
        .sort(function (a, b) {
            return (a.title || "").localeCompare(b.title || "");
        });

    eventEmptyMessage.classList.toggle(
        "hidden",
        selectedEvents.length > 0
    );

    selectedEvents.forEach(function (item) {
        const eventCard = createElement("article", "event-item");

        const title = createElement("h4", "event-title", item.title);

        const type = createElement(
            "span",
            "event-type",
            item.type || "Other"
        );

        eventCard.append(title, type);

        if (item.notes) {
            eventCard.appendChild(
                createElement("p", "event-notes", item.notes)
            );
        }

        const bottom = createElement("div", "event-bottom");
        bottom.appendChild(
            createElement("span", "task-meta", formatDate(item.date))
        );

        const actions = createElement("div", "event-actions");

        const editButton = createElement("button", "small-action", "✎");
        editButton.type = "button";
        editButton.title = "Edit event";
        editButton.setAttribute("aria-label", `Edit ${item.title}`);

        editButton.addEventListener("click", function () {
            editEvent(item.id);
        });

        const deleteButton = createElement(
            "button",
            "small-action delete",
            "×"
        );

        deleteButton.type = "button";
        deleteButton.title = "Delete event";
        deleteButton.setAttribute("aria-label", `Delete ${item.title}`);

        deleteButton.addEventListener("click", function () {
            deleteEvent(item.id);
        });

        actions.append(editButton, deleteButton);
        bottom.appendChild(actions);

        eventCard.appendChild(bottom);
        eventList.appendChild(eventCard);
    });
}

// Edit event
function editEvent(id) {
    const item = events.find(function (event) {
        return event.id === id;
    });

    if (!item) return;

    editingEventId = id;

    eventTitle.value = item.title || "";
    eventType.value = item.type || "Other";
    eventDate.value = item.date || selectedDate;
    eventNotes.value = item.notes || "";

    eventFormHeading.textContent = "Edit Academic Event";
    eventSubmitButton.textContent = "Save Changes";
    cancelEventEditButton.classList.remove("hidden");

    eventForm.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

    eventTitle.focus();
}

// Delete event
function deleteEvent(id) {
    const item = events.find(function (event) {
        return event.id === id;
    });

    if (!item) return;

    const confirmed = confirm(
        `Delete the event "${item.title}"?`
    );

    if (!confirmed) return;

    events = events.filter(function (event) {
        return event.id !== id;
    });

    if (editingEventId === id) {
        resetEventForm();
    }

    saveData(EVENTS_KEY, events);
    renderCalendar();
    renderEvents();
}

// ========================================
// INITIAL PAGE SETUP
// ========================================

function initialisePlanner() {
    taskDate.value = today;
    eventDate.value = today;

    renderTasks();
    updateStatistics();
    renderCalendar();
    renderEvents();
}

initialisePlanner();
