const STORAGE_KEY = "todos-v1";

const swStatus = document.getElementById("sw-status");
const content = document.getElementById("app-content");
const homeBtn = document.getElementById("home-btn");
const aboutBtn = document.getElementById("about-btn");

function setActive(active) {
  homeBtn.classList.toggle("active", active === "home");
  aboutBtn.classList.toggle("active", active === "about");
}

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

function render(list) {
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
}

function toggle(id) {
  const todos = loadTodos();
  const t = todos.find((x) => x.id === id);
  if (!t) return;
  t.done = !t.done;
  saveTodos(todos);
}

function remove(id) {
  const todos = loadTodos().filter((x) => x.id !== id);
  saveTodos(todos);
}

function initTodos() {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");

  if (!form || !input || !list) return;

  function rerender() {
    render(list);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    add(text);
    input.value = "";
    input.focus();
    rerender();
  });

  rerender();
}

async function loadContent(page) {
  try {
    const res = await fetch(`/content/${page}.html`, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    content.innerHTML = await res.text();

    if (page === "home") initTodos();
  } catch (e) {
    content.innerHTML = "<p>Ошибка загрузки страницы.</p>";
    console.error(e);
  }
}

homeBtn.addEventListener("click", () => {
  setActive("home");
  loadContent("home");
});

aboutBtn.addEventListener("click", () => {
  setActive("about");
  loadContent("about");
});

setActive("home");
loadContent("home");

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
