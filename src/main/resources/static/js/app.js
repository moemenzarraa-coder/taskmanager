"use strict";

const API = "/api/tasks";

const state = {
  tasks: [],
  filter: "all",
  editingId: null,
  newId: null
};

const ui = {
  health: document.getElementById("health"),
  counter: document.getElementById("counter"),
  progressFill: document.getElementById("progress-fill"),
  progressLabel: document.getElementById("progress-label"),
  composer: document.getElementById("composer"),
  newTitle: document.getElementById("new-title"),
  newDescription: document.getElementById("new-description"),
  list: document.getElementById("tasks"),
  empty: document.getElementById("empty"),
  toast: document.getElementById("toast"),
  filters: document.querySelectorAll(".filter")
};

const dayFormat = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" });
const timeFormat = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });

class ApiError extends Error {
  constructor(status) {
    super("HTTP " + status);
    this.status = status;
  }
}

async function request(method, url, body) {
  const options = { method, headers: { Accept: "application/json" } };
  if (body !== undefined) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(body);
  }
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new ApiError(response.status);
  }
  return response.status === 204 ? null : response.json();
}

function errorMessage(error) {
  if (error instanceof ApiError) {
    if (error.status === 400) {
      return "Le titre est obligatoire (100 caractères au plus) et la description fait 500 caractères au plus.";
    }
    if (error.status === 404) {
      return "Cette tâche n'existe plus. La liste a été rechargée.";
    }
    return "Le serveur a répondu avec une erreur " + error.status + ".";
  }
  return "Le serveur ne répond pas. Vérifiez que l'application est lancée.";
}

let toastTimer;

function showToast(message, kind) {
  clearTimeout(toastTimer);
  ui.toast.textContent = message;
  ui.toast.dataset.kind = kind || "info";
  ui.toast.hidden = false;
  toastTimer = setTimeout(() => {
    ui.toast.hidden = true;
  }, kind === "error" ? 6000 : 3000);
}

async function handleError(error) {
  showToast(errorMessage(error), "error");
  if (error instanceof ApiError && error.status === 404) {
    await loadTasks();
  }
}

function formatCreatedAt(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return "Créée aujourd'hui à " + timeFormat.format(date);
  }
  return "Créée le " + dayFormat.format(date);
}

function plural(count, singular, pluralForm) {
  return count + " " + (count > 1 ? pluralForm : singular);
}

function renderSummary() {
  const total = state.tasks.length;
  const done = state.tasks.filter((task) => task.done).length;
  const todo = total - done;

  if (total === 0) {
    ui.counter.textContent = "Rien à faire";
    ui.progressLabel.textContent = "Ajoutez une première tâche pour commencer.";
  } else if (todo === 0) {
    ui.counter.textContent = "Tout est fait";
    ui.progressLabel.textContent = plural(total, "tâche terminée", "tâches terminées") + ".";
  } else {
    ui.counter.textContent = plural(todo, "tâche à faire", "tâches à faire");
    ui.progressLabel.textContent = done + " sur " + total + " terminée" + (done > 1 ? "s" : "") + ".";
  }

  ui.progressFill.style.width = total === 0 ? "0%" : Math.round((done / total) * 100) + "%";
  document.title = todo > 0 ? "(" + todo + ") Taskmanager" : "Taskmanager";

  document.querySelector('[data-count="all"]').textContent = total;
  document.querySelector('[data-count="todo"]').textContent = todo;
  document.querySelector('[data-count="done"]').textContent = done;
}

function visibleTasks() {
  const sorted = [...state.tasks].sort((a, b) => {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return b.id - a.id;
  });
  if (state.filter === "todo") {
    return sorted.filter((task) => !task.done);
  }
  if (state.filter === "done") {
    return sorted.filter((task) => task.done);
  }
  return sorted;
}

function createCheckIcon() {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS(ns, "path");
  path.setAttribute("d", "M3 8.5l3 3 7-7");
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "#fff");
  path.setAttribute("stroke-width", "2.4");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.appendChild(path);
  return svg;
}

function button(label, className, onClick) {
  const element = document.createElement("button");
  element.type = "button";
  element.className = className;
  element.textContent = label;
  element.addEventListener("click", onClick);
  return element;
}

function renderTask(task) {
  const item = document.createElement("li");
  item.className = "task" + (task.done ? " is-done" : "") + (task.id === state.newId ? " is-new" : "");
  item.dataset.id = task.id;

  const check = document.createElement("button");
  check.type = "button";
  check.className = "check";
  check.setAttribute("aria-pressed", String(task.done));
  check.setAttribute("aria-label", (task.done ? "Marquer à faire : " : "Marquer terminée : ") + task.title);
  check.appendChild(createCheckIcon());
  check.addEventListener("click", () => toggleTask(task));
  item.appendChild(check);

  if (state.editingId === task.id) {
    item.appendChild(renderEditor(task));
    return item;
  }

  const body = document.createElement("div");
  body.className = "task-body";

  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = task.title;
  body.appendChild(title);

  if (task.description) {
    const description = document.createElement("p");
    description.className = "task-description";
    description.textContent = task.description;
    body.appendChild(description);
  }

  const date = document.createElement("p");
  date.className = "task-date";
  date.textContent = formatCreatedAt(task.createdAt);
  body.appendChild(date);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.appendChild(button("Modifier", "link-button", () => startEditing(task.id)));
  actions.appendChild(button("Supprimer", "link-button danger", () => deleteTask(task)));

  item.appendChild(body);
  item.appendChild(actions);
  return item;
}

function renderEditor(task) {
  const form = document.createElement("form");
  form.className = "task-edit";
  form.noValidate = true;

  const title = document.createElement("input");
  title.type = "text";
  title.maxLength = 100;
  title.value = task.title;
  title.setAttribute("aria-label", "Titre");

  const description = document.createElement("textarea");
  description.rows = 2;
  description.maxLength = 500;
  description.value = task.description || "";
  description.setAttribute("aria-label", "Description");

  const actions = document.createElement("div");
  actions.className = "task-edit-actions";
  const save = document.createElement("button");
  save.type = "submit";
  save.className = "button-primary";
  save.textContent = "Enregistrer";
  actions.appendChild(save);
  actions.appendChild(button("Annuler", "link-button", stopEditing));

  form.append(title, description, actions);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    saveTask(task, title.value, description.value);
  });
  form.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      stopEditing();
    }
  });

  requestAnimationFrame(() => title.focus());
  return form;
}

function render() {
  renderSummary();
  const tasks = visibleTasks();
  ui.list.replaceChildren(...tasks.map(renderTask));

  if (tasks.length === 0) {
    const messages = {
      all: "Aucune tâche pour l'instant. Écrivez la première dans le champ ci-dessus.",
      todo: "Aucune tâche en attente.",
      done: "Aucune tâche terminée pour l'instant."
    };
    ui.empty.textContent = messages[state.filter];
    ui.empty.hidden = false;
  } else {
    ui.empty.hidden = true;
  }
  state.newId = null;
}

async function loadTasks() {
  try {
    state.tasks = await request("GET", API);
    render();
  } catch (error) {
    ui.counter.textContent = "Hors ligne";
    ui.progressLabel.textContent = errorMessage(error);
  }
}

async function createTask(event) {
  event.preventDefault();
  const title = ui.newTitle.value.trim();
  if (!title) {
    ui.newTitle.setAttribute("aria-invalid", "true");
    showToast("Donnez un titre à la tâche.", "error");
    ui.newTitle.focus();
    return;
  }
  ui.newTitle.removeAttribute("aria-invalid");

  const submit = ui.composer.querySelector("button[type=submit]");
  submit.disabled = true;
  try {
    const created = await request("POST", API, {
      title,
      description: ui.newDescription.value.trim() || null,
      done: false
    });
    state.tasks.push(created);
    state.newId = created.id;
    ui.composer.reset();
    if (state.filter === "done") {
      setFilter("all");
    } else {
      render();
    }
    showToast("Tâche ajoutée.");
    ui.newTitle.focus();
  } catch (error) {
    await handleError(error);
  } finally {
    submit.disabled = false;
  }
}

function replaceTask(updated) {
  state.tasks = state.tasks.map((task) => (task.id === updated.id ? updated : task));
}

async function toggleTask(task) {
  try {
    const updated = await request("PUT", API + "/" + task.id, {
      title: task.title,
      description: task.description,
      done: !task.done
    });
    replaceTask(updated);
    render();
  } catch (error) {
    await handleError(error);
  }
}

async function saveTask(task, title, description) {
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    showToast("Donnez un titre à la tâche.", "error");
    return;
  }
  try {
    const updated = await request("PUT", API + "/" + task.id, {
      title: cleanTitle,
      description: description.trim() || null,
      done: task.done
    });
    replaceTask(updated);
    state.editingId = null;
    render();
    showToast("Modifications enregistrées.");
  } catch (error) {
    await handleError(error);
  }
}

async function deleteTask(task) {
  try {
    await request("DELETE", API + "/" + task.id);
    state.tasks = state.tasks.filter((item) => item.id !== task.id);
    render();
    showToast("Tâche « " + task.title + " » supprimée.");
  } catch (error) {
    await handleError(error);
  }
}

function startEditing(id) {
  state.editingId = id;
  render();
}

function stopEditing() {
  const id = state.editingId;
  state.editingId = null;
  render();
  const check = ui.list.querySelector('[data-id="' + id + '"] .check');
  if (check) {
    check.focus();
  }
}

function setFilter(filter) {
  state.filter = filter;
  ui.filters.forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.filter === filter));
  });
  render();
}

async function checkHealth() {
  try {
    const health = await request("GET", "/actuator/health");
    const up = health && health.status === "UP";
    ui.health.dataset.state = up ? "up" : "down";
    ui.health.textContent = up ? "Service en ligne" : "Service dégradé";
  } catch {
    ui.health.dataset.state = "down";
    ui.health.textContent = "Service injoignable";
  }
}

ui.composer.addEventListener("submit", createTask);
ui.newTitle.addEventListener("input", () => ui.newTitle.removeAttribute("aria-invalid"));
ui.filters.forEach((item) => {
  item.addEventListener("click", () => setFilter(item.dataset.filter));
});

loadTasks();
checkHealth();
setInterval(checkHealth, 30000);
