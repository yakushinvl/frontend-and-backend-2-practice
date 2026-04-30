const STORAGE_KEY = "todos-v1";

const swStatus = document.getElementById("sw-status");
const content = document.getElementById("app-content");
const homeBtn = document.getElementById("home-btn");
const aboutBtn = document.getElementById("about-btn");

const enablePushBtn = document.getElementById("enable-push");
const disablePushBtn = document.getElementById("disable-push");

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;

/** @type {ReturnType<typeof io> | null} */
let socket = null;
let currentListEl = null;

function toast(message) {
  const el = document.createElement("div");
  el.textContent = message;
  el.style.cssText = `
    position: fixed; top: 10px; right: 10px;
    background: #2563eb; color: white; padding: 0.75rem 0.9rem;
    border-radius: 8px; z-index: 1000; box-shadow: 0 8px 24px rgba(0,0,0,.18);
  `;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

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

function upsertRemoteTask(task) {
  if (!task?.id || !task?.text) return;
  const todos = loadTodos();
  const exists = todos.some((t) => t.id === task.id);
  if (exists) return;
  todos.unshift({ id: task.id, text: task.text, done: false, createdAt: task.createdAt ?? Date.now() });
  saveTodos(todos);
  if (currentListEl) render(currentListEl);
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
  currentListEl = list;

  function rerender() {
    render(list);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    const id = uid();
    const createdAt = Date.now();
    const todos = loadTodos();
    todos.unshift({ id, text, done: false, createdAt });
    saveTodos(todos);

    if (socket) socket.emit("newTask", { id, text, createdAt });
    input.value = "";
    input.focus();
    rerender();
  });

  rerender();
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function subscribeToPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });
  await fetch("/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(subscription),
  });
}

async function unsubscribeFromPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  await fetch("/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

function initSocket() {
  if (typeof window.io !== "function") return;
  socket = window.io();

  socket.on("connect", () => {
    swStatus.textContent = swStatus.textContent || "Подключено.";
  });

  socket.on("taskAdded", (task) => {
    toast(`Новая задача: ${task?.text ?? ""}`);
    upsertRemoteTask(task);
  });
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
    const reg = await navigator.serviceWorker.register("/sw.js");
    swStatus.textContent = "Service Worker зарегистрирован.";

    if (enablePushBtn && disablePushBtn) {
      const existing = await reg.pushManager.getSubscription();
      enablePushBtn.style.display = existing ? "none" : "inline-block";
      disablePushBtn.style.display = existing ? "inline-block" : "none";

      enablePushBtn.addEventListener("click", async () => {
        if (Notification.permission === "denied") {
          alert("Уведомления запрещены. Разрешите их в настройках браузера.");
          return;
        }
        if (Notification.permission === "default") {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            alert("Необходимо разрешить уведомления.");
            return;
          }
        }
        await subscribeToPush();
        enablePushBtn.style.display = "none";
        disablePushBtn.style.display = "inline-block";
      });

      disablePushBtn.addEventListener("click", async () => {
        await unsubscribeFromPush();
        disablePushBtn.style.display = "none";
        enablePushBtn.style.display = "inline-block";
      });
    }
  } catch (e) {
    swStatus.textContent = "Service Worker: ошибка регистрации (см. консоль).";
    console.error(e);
  }
}

window.addEventListener("load", () => {
  initSocket();
  registerServiceWorker();
});
