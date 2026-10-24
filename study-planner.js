
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("unifiedForm");
    const titleInput = document.getElementById("unifiedTitle");
    const categoryInput = document.getElementById("unifiedType");
    const subjectInput = document.getElementById("unifiedSubject");
    const dateInput = document.getElementById("unifiedDate");
    const descriptionInput = document.getElementById("unifiedDescription");

    const categoriesContainer = document.getElementById("eventCategories");
    const totalCount = document.getElementById("totalCount");
    const completedCount = document.getElementById("completedCount");
    const pendingCount = document.getElementById("pendingCount");
    const eventTotal = document.getElementById("eventTotal");

    const STORAGE_KEY = "luminaStudyPlannerItems";
    const OLD_TASKS_KEY = "luminaStudyPlannerTasks";
    const OLD_EVENTS_KEY = "luminaStudyPlannerEvents";

    let activities = loadActivities();

    renderActivities();

    // Add a new activity.
    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const title = titleInput.value.trim();
        const categoryText = categoryInput.value.trim();

        if (!title || !categoryText) {
            alert("Please enter the activity name and category.");
            return;
        }

        const activity = {
            id: createId(),
            title,
            category: normaliseCategory(categoryText),
            subject: subjectInput.value.trim(),
            date: dateInput.value,
            description: descriptionInput.value.trim(),
            completed: false,
            createdAt: Date.now()
        };

        activities.push(activity);
        saveActivities();
        renderActivities();

        form.reset();
        titleInput.focus();
    });

    // Clear Form is handled by the browser's native reset behaviour.
    form.addEventListener("reset", () => {
        // No saved activity is changed when the form is cleared.
    });

    // Handle completion and deletion from the unified activity list.
    categoriesContainer.addEventListener("change", (event) => {
        const checkbox = event.target.closest("[data-action='complete']");

        if (!checkbox) return;

        const activity = activities.find(
            item => item.id === checkbox.dataset.id
        );

        if (!activity) return;

        activity.completed = checkbox.checked;
        saveActivities();
        renderActivities();
    });

    categoriesContainer.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("[data-action='delete']");

        if (!deleteButton) return;

        const activity = activities.find(
            item => item.id === deleteButton.dataset.id
        );

        if (!activity) return;

        const shouldDelete = confirm(
            `Delete "${activity.title}"?`
        );

        if (!shouldDelete) return;

        activities = activities.filter(
            item => item.id !== deleteButton.dataset.id
        );

        saveActivities();
        renderActivities();
    });

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `activity-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    }

    function readArrayFromStorage(key) {
        try {
            const stored = localStorage.getItem(key);

            if (!stored) return [];

            const parsed = JSON.parse(stored);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error(`Could not read ${key}:`, error);
            return [];
        }
    }

    function loadActivities() {
        // Prefer the unified storage after it has been created.
        try {
            const unifiedData = localStorage.getItem(STORAGE_KEY);

            if (unifiedData !== null) {
                const parsed = JSON.parse(unifiedData);

                if (Array.isArray(parsed)) {
                    return parsed.map(normaliseSavedActivity);
                }
            }
        } catch (error) {
            console.error("Could not load saved activities:", error);
        }

        // First-time migration from the previous task and event lists.
        const oldTasks = readArrayFromStorage(OLD_TASKS_KEY);
        const oldEvents = readArrayFromStorage(OLD_EVENTS_KEY);

        const migratedTasks = oldTasks.map(task => ({
            id: String(task.id || createId()),
            title: String(task.title || task.name || "Untitled activity"),
            category: normaliseCategory(
                task.category || task.type || "Study"
            ),
            subject: String(task.subject || ""),
            date: String(task.date || task.dueDate || ""),
            description: String(task.description || ""),
            completed: Boolean(task.completed),
            createdAt: Number(task.createdAt || Date.now())
        }));

        const migratedEvents = oldEvents.map(item => ({
            id: String(item.id || createId()),
            title: String(item.title || item.name || "Untitled activity"),
            category: normaliseCategory(
                item.category || item.type || "Other Events"
            ),
            subject: String(item.subject || ""),
            date: String(item.date || item.dueDate || ""),
            description: String(item.description || ""),
            completed: Boolean(item.completed),
            createdAt: Number(item.createdAt || Date.now())
        }));

        const migrated = [...migratedTasks, ...migratedEvents];

        if (migrated.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
            } catch (error) {
                console.error("Could not migrate activities:", error);
            }
        }

        return migrated;
    }

    function normaliseSavedActivity(item) {
        return {
            id: String(item.id || createId()),
            title: String(item.title || item.name || "Untitled activity"),
            category: normaliseCategory(
                item.category || item.type || "Study"
            ),
            subject: String(item.subject || ""),
            date: String(item.date || item.dueDate || ""),
            description: String(item.description || ""),
            completed: Boolean(item.completed),
            createdAt: Number(item.createdAt || Date.now())
        };
    }

    function saveActivities() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(activities));
        } catch (error) {
            console.error("Could not save activities:", error);
            alert("Your activity could not be saved. Please check your browser storage.");
        }
    }

    // Standard categories use consistent names.
    // New categories are also supported automatically.
    function normaliseCategory(value) {
        const trimmed = value.trim().replace(/\s+/g, " ");
        const key = trimmed.toLowerCase();

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

            study: "Study",
            studies: "Study",

            revision: "Revision",
            revisions: "Revision",

            presentation: "Presentations",
            presentations: "Presentations",

            workshop: "Workshops",
            workshops: "Workshops",

            class: "Classes",
            classes: "Classes",
            lecture: "Classes",
            lectures: "Classes",

            deadline: "Deadlines",
            deadlines: "Deadlines",

            event: "Other Events",
            events: "Other Events",
            "other event": "Other Events",
            "other events": "Other Events"
        };

        if (standardCategories[key]) {
            return standardCategories[key];
        }

        // Preserve an already-plural custom category.
        if (/ies$/i.test(trimmed) || /s$/i.test(trimmed)) {
            return capitaliseWords(trimmed);
        }

        // Give a custom singular category its own plural group.
        if (/[^aeiou]y$/i.test(trimmed)) {
            return capitaliseWords(trimmed.slice(0, -1) + "ies");
        }

        if (/(s|x|z|ch|sh)$/i.test(trimmed)) {
            return capitaliseWords(trimmed + "es");
        }

        return capitaliseWords(trimmed + "s");
    }

    function capitaliseWords(value) {
        return value
            .split(" ")
            .map(word => {
                if (!word) return word;
                return word.charAt(0).toUpperCase() + word.slice(1);
            })
            .join(" ");
    }

    function renderActivities() {
        renderSummary();

        categoriesContainer.replaceChildren();

        if (activities.length === 0) {
            const emptyState = document.createElement("div");
            emptyState.className = "empty-state";

            const icon = document.createElement("span");
            icon.className = "empty-icon";
            icon.textContent = "🌿";

            const heading = document.createElement("h3");
            heading.textContent = "Your planner is ready!";

            const message = document.createElement("p");
            message.textContent =
                "Add your first activity above. Your items will appear here, grouped by category.";

            emptyState.append(icon, heading, message);
            categoriesContainer.appendChild(emptyState);
            return;
        }

        // Group all activities by category.
        const grouped = new Map();

        activities.forEach(activity => {
            const category = normaliseCategory(activity.category || "Study");
            activity.category = category;

            if (!grouped.has(category)) {
                grouped.set(category, []);
            }

            grouped.get(category).push(activity);
        });

        const sortedCategories = [...grouped.keys()].sort((a, b) =>
            a.localeCompare(b)
        );

        sortedCategories.forEach(category => {
            const categorySection = document.createElement("section");
            categorySection.className = "event-category";

            const headingRow = document.createElement("div");
            headingRow.className = "category-heading";

            const heading = document.createElement("h3");
            heading.textContent = category;

            const items = grouped.get(category);
            const count = document.createElement("span");
            count.className = "category-count";
            count.textContent = `${items.length} ${items.length === 1 ? "item" : "items"}`;

            headingRow.append(heading, count);

            const itemsContainer = document.createElement("div");
            itemsContainer.className = "category-items";

            // Show activities with nearer dates first; undated items last.
            items.sort((a, b) => {
                if (a.completed !== b.completed) {
                    return Number(a.completed) - Number(b.completed);
                }

                if (a.date && b.date) {
                    return a.date.localeCompare(b.date);
                }

                if (a.date) return -1;
                if (b.date) return 1;

                return (a.createdAt || 0) - (b.createdAt || 0);
            });

            items.forEach(activity => {
                itemsContainer.appendChild(createActivityCard(activity));
            });

            categorySection.append(headingRow, itemsContainer);
            categoriesContainer.appendChild(categorySection);
        });
    }

    function renderSummary() {
        const completed = activities.filter(item => item.completed).length;
        const pending = activities.length - completed;

        totalCount.textContent = activities.length;
        completedCount.textContent = completed;
        pendingCount.textContent = pending;

        eventTotal.textContent =
            `${activities.length} ${activities.length === 1 ? "item" : "items"}`;
    }

    function createActivityCard(activity) {
        const card = document.createElement("article");
        card.className = "activity-card";

        if (activity.completed) {
            card.classList.add("is-completed");
        }

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "completion-control";
        checkbox.checked = activity.completed;
        checkbox.dataset.action = "complete";
        checkbox.dataset.id = activity.id;
        checkbox.setAttribute(
            "aria-label",
            `Mark ${activity.title} as ${activity.completed ? "pending" : "completed"}`
        );

        const content = document.createElement("div");
        content.className = "activity-content";

        const title = document.createElement("h4");
        title.className = "activity-title";
        title.textContent = activity.title;
        content.appendChild(title);

        if (activity.subject) {
            const subject = document.createElement("p");
            subject.className = "activity-subject";
            subject.textContent = `📘 ${activity.subject}`;
            content.appendChild(subject);
        }

        if (activity.description) {
            const description = document.createElement("p");
            description.className = "activity-description";
            description.textContent = activity.description;
            content.appendChild(description);
        }

        const meta = document.createElement("div");
        meta.className = "activity-meta";

        if (activity.date && isValidDateString(activity.date)) {
            const dateLabel = document.createElement("span");
            dateLabel.className = "activity-date";
            dateLabel.textContent = `🗓️ ${formatDate(activity.date)}`;
            meta.appendChild(dateLabel);

            if (!activity.completed) {
                const reminder = createDateReminder(activity.date);

                if (reminder) {
                    meta.appendChild(reminder);
                }
            }
        }

        if (activity.completed) {
            const status = document.createElement("span");
            status.textContent = "✓ Completed";
            meta.appendChild(status);
        }

        if (meta.childElementCount > 0) {
            content.appendChild(meta);
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.dataset.action = "delete";
        deleteButton.dataset.id = activity.id;
        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${activity.title}`);

        card.append(checkbox, content, deleteButton);

        return card;
    }

    function parseLocalDate(dateString) {
        const parts = dateString.split("-").map(Number);

        if (parts.length !== 3 || parts.some(Number.isNaN)) {
            return null;
        }

        const date = new Date(parts[0], parts[1] - 1, parts[2]);
        date.setHours(0, 0, 0, 0);

        if (
            date.getFullYear() !== parts[0] ||
            date.getMonth() !== parts[1] - 1 ||
            date.getDate() !== parts[2]
        ) {
            return null;
        }

        return date;
    }

    function isValidDateString(dateString) {
        return Boolean(parseLocalDate(dateString));
    }

    function formatDate(dateString) {
        const date = parseLocalDate(dateString);

        if (!date) return dateString;

        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function createDateReminder(dateString) {
        const dueDate = parseLocalDate(dateString);

        if (!dueDate) return null;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const daysRemaining = Math.round(
            (dueDate.getTime() - today.getTime()) / 86400000
        );

        // Show a reminder for overdue items and items due within 7 days.
        if (daysRemaining > 7) return null;

        const reminder = document.createElement("span");
        reminder.className = "date-reminder";

        if (daysRemaining < 0) {
            reminder.textContent = `Overdue by ${Math.abs(daysRemaining)} ${Math.abs(daysRemaining) === 1 ? "day" : "days"}`;
            reminder.classList.add("is-overdue");
        } else if (daysRemaining === 0) {
            reminder.textContent = "Due today";
            reminder.classList.add("is-today");
        } else if (daysRemaining === 1) {
            reminder.textContent = "Due tomorrow";
        } else {
            reminder.textContent = `Due in ${daysRemaining} days`;
        }

        return reminder;
    }
});
