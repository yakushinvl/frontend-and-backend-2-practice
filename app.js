const STORAGE_KEY = "todos-v1";

const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const list = document.getElementById("todo-list");
const swStatus = document.getElementById("sw-status");

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function uid() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function render() {
  const todos = loadTodos();
  list.innerHTML = "";

  for (const todo of todos) {
    const li = document.createElement("li");
    li.className = todo.done ? "done" : "";
    li.dataset.id = todo.id;

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = Boolean(todo.done);
    cb.addEventListener("change", () => toggle(todo.id));

    const text = document.createElement("span");
    text.textContent = todo.text;

    const del = document.createElement("button");
    del.type = "button";
    del.textContent = "Удалить";
    del.addEventListener("click", () => remove(todo.id));

    li.append(cb, text, del);
    list.append(li);
  }
}

function add(text) {
  const todos = loadTodos();
  todos.unshift({ id: uid(), text, done: false, createdAt: Date.now() });
  saveTodos(todos);
  render();
}

function toggle(id) {
  const todos = loadTodos();
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTodos(todos);
  render();
}

function remove(id) {
  const todos = loadTodos().filter((x) => x.id !== id);
  saveTodos(todos);
  render();
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  add(text);
  input.value = "";
  input.focus();
});

render();

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    swStatus.textContent = "Service Worker не поддерживается.";
    return;
  }

  try {
    await navigator.serviceWorker.register("/sw.js");
    swStatus.textContent = "Service Worker зарегистрирован.";
  } catch (e) {
    swStatus.textContent = "Service Worker: ошибка регистрации (см. консоль).";
    console.error(e);
  }
}

window.addEventListener("load", registerServiceWorker);
