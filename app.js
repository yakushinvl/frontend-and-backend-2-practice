const STORAGE_KEY = "todos-v1";
const VAPID_PUBLIC_KEY = "BCxdOsmll-UVV-NbEEkj1M9jST-8pq-Avo_GhlNbF_uZkvcyekYbPtqxDZwMYjE16QFiZXK44fSwEUMa5-38voQ";
const SERVER_URL = "http://localhost:3001";

const swStatus = document.getElementById("sw-status");
const content = document.getElementById("app-content");
const homeBtn = document.getElementById("home-btn");
const aboutBtn = document.getElementById("about-btn");
const enablePushBtn = document.getElementById("enable-push");
const disablePushBtn = document.getElementById("disable-push");

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

function loadTodos() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTodos(todos) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function render(list) {
  const todos = loadTodos();
  list.innerHTML = "";
  todos.forEach(todo => {
    const li = document.createElement("li");
    if (todo.done) li.className = "done";
    
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = !!todo.done;
    cb.onclick = () => {
      const all = loadTodos();
      const t = all.find(x => x.id === todo.id);
      if (t) t.done = !t.done;
      saveTodos(all);
      render(list);
    };

    const text = document.createElement("span");
    let reminderText = "";
    if (todo.reminder) {
      reminderText = ` (${new Date(todo.reminder).toLocaleString()})`;
    }
    text.textContent = todo.text + reminderText;

    const del = document.createElement("button");
    del.textContent = "Удалить";
    del.onclick = () => {
      const all = loadTodos().filter(x => x.id !== todo.id);
      saveTodos(all);
      render(list);
    };

    li.append(cb, text, del);
    list.append(li);
  });
}

function initTodos() {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const reminderForm = document.getElementById("reminder-form");
  const reminderText = document.getElementById("reminder-text");
  const reminderTime = document.getElementById("reminder-time");
  const list = document.getElementById("todo-list");

  if (!list) return;
  currentListEl = list;
  render(list);

  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      const val = input.value.trim();
      if (!val) return;
      const todo = { id: uid(), text: val, done: false, createdAt: Date.now() };
      const all = loadTodos();
      all.unshift(todo);
      saveTodos(all);
      if (socket) socket.emit("newTask", todo);
      input.value = "";
      render(list);
    };
  }

  if (reminderForm) {
    reminderForm.onsubmit = (e) => {
      e.preventDefault();
      const text = reminderText.value.trim();
      const time = reminderTime.value;
      if (!text || !time) return;

      const ts = new Date(time).getTime();
      if (ts <= Date.now()) {
        alert("Время должно быть в будущем");
        return;
      }

      const todo = { id: uid(), text, done: false, createdAt: Date.now(), reminder: ts };
      const all = loadTodos();
      all.unshift(todo);
      saveTodos(all);

      if (socket) socket.emit("newReminder", { id: todo.id, text, reminderTime: ts });

      reminderText.value = "";
      reminderTime.value = "";
      render(list);
    };
  }
}

async function loadPage(page) {
  homeBtn.classList.toggle("active", page === "home");
  aboutBtn.classList.toggle("active", page === "about");
  
  try {
    const res = await fetch(`/content/${page}.html`);
    content.innerHTML = await res.text();
    if (page === "home") initTodos();
  } catch (err) {
    content.innerHTML = "<p>Ошибка загрузки страницы</p>";
  }
}

async function subscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });

    await fetch(`${SERVER_URL}/subscribe`, {
      method: 'POST',
      body: JSON.stringify(sub),
      headers: { 'Content-Type': 'application/json' }
    });

    enablePushBtn.style.display = "none";
    disablePushBtn.style.display = "inline-block";
    toast("Уведомления включены");
  } catch (err) {
    console.error("Subscription failed", err);
  }
}

async function unsubscribe() {
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) {
      await sub.unsubscribe();
      await fetch(`${SERVER_URL}/unsubscribe`, {
        method: 'POST',
        body: JSON.stringify({ endpoint: sub.endpoint }),
        headers: { 'Content-Type': 'application/json' }
      });
    }
    enablePushBtn.style.display = "inline-block";
    disablePushBtn.style.display = "none";
    toast("Уведомления выключены");
  } catch (err) {
    console.error("Unsubscription failed", err);
  }
}

window.addEventListener("load", async () => {
  console.log("App loaded, starting initialization...");

  if ("serviceWorker" in navigator) {
    try {
      console.log("Registering Service Worker...");
      const reg = await navigator.serviceWorker.register("/sw.js");
      console.log("Service Worker registered successfully with scope:", reg.scope);
      swStatus.textContent = "Service Worker активен";
      
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        enablePushBtn.style.display = "none";
        disablePushBtn.style.display = "inline-block";
      }
    } catch (err) {
      console.error("Service Worker registration failed:", err);
      swStatus.textContent = "Ошибка Service Worker: " + err.message;
    }
  } else {
    swStatus.textContent = "Service Worker не поддерживается";
  }

  if (window.io) {
    try {
      socket = window.io(SERVER_URL);
      socket.on("connect", () => console.log("Socket connected"));
      socket.on("taskAdded", (task) => {
        toast("Новая задача: " + task.text);
      });
    } catch (err) {
      console.error("Socket.io initialization failed:", err);
    }
  }

  homeBtn.onclick = () => loadPage("home");
  aboutBtn.onclick = () => loadPage("about");
  enablePushBtn.onclick = subscribe;
  disablePushBtn.onclick = unsubscribe;

  loadPage("home");
});
