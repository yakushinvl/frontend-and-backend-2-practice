const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const webpush = require("web-push");

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

const vapidKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY,
    privateKey: process.env.VAPID_PRIVATE_KEY,
};

webpush.setVapidDetails("mailto:student@example.com", vapidKeys.publicKey, vapidKeys.privateKey);

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "./")));

/** @type {import('web-push').PushSubscription[]} */
let subscriptions = [];

// Активные напоминания: id -> { timeoutId, text, reminderTime }
const reminders = new Map();

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});

io.on("connection", (socket) => {
    console.log("Клиент подключён:", socket.id);

    socket.on("newTask", (task) => {
        io.emit("taskAdded", task);

        const payload = JSON.stringify({
            title: "Новая задача",
            body: task?.text ?? "",
        });

        subscriptions.forEach((sub) => {
            webpush.sendNotification(sub, payload).catch((err) => {
                const status = err?.statusCode;
                if (status === 404 || status === 410) {
                    subscriptions = subscriptions.filter((s) => s.endpoint !== sub.endpoint);
                    return;
                }
                console.error("Push error:", err);
            });
        });
    });

    socket.on("newReminder", (reminder) => {
        const { id, text, reminderTime } = reminder || {};
        if (!id || !text || !reminderTime) return;

        const delay = Number(reminderTime) - Date.now();
        if (!Number.isFinite(delay) || delay <= 0) return;

        if (reminders.has(id)) {
            const prev = reminders.get(id);
            clearTimeout(prev.timeoutId);
        }

        const timeoutId = setTimeout(() => {
            const payload = JSON.stringify({
                title: "!!! Напоминание",
                body: text,
                reminderId: id,
            });

            subscriptions.forEach((sub) => {
                webpush.sendNotification(sub, payload).catch((err) => console.error("Push error:", err));
            });
            reminders.delete(id);
        }, delay);

        reminders.set(id, { timeoutId, text, reminderTime: Number(reminderTime) });
    });

    socket.on("disconnect", () => console.log("Клиент отключён:", socket.id));
});

app.post("/subscribe", (req, res) => {
    const sub = req.body;
    if (!sub?.endpoint) return res.status(400).json({ message: "Invalid subscription" });

    const exists = subscriptions.some((s) => s.endpoint === sub.endpoint);
    if (!exists) subscriptions.push(sub);

    return res.status(201).json({ message: "Подписка сохранена" });
});

app.post("/unsubscribe", (req, res) => {
    const { endpoint } = req.body || {};
    if (!endpoint) return res.status(400).json({ message: "Missing endpoint" });

    subscriptions = subscriptions.filter((s) => s.endpoint !== endpoint);
    return res.status(200).json({ message: "Подписка удалена" });
});

app.post("/snooze", (req, res) => {
    const reminderId = String(req.query.reminderId || "");
    if (!reminderId || !reminders.has(reminderId)) return res.status(404).json({ error: "Reminder not found" });

    const reminder = reminders.get(reminderId);
    clearTimeout(reminder.timeoutId);

    const newDelay = 5 * 60 * 1000;
    const newTimeoutId = setTimeout(() => {
        const payload = JSON.stringify({
            title: "Напоминание отложено",
            body: reminder.text,
            reminderId,
        });
        subscriptions.forEach((sub) => {
            webpush.sendNotification(sub, payload).catch((err) => console.error("Push error:", err));
        });
        reminders.delete(reminderId);
    }, newDelay);

    reminders.set(reminderId, { timeoutId: newTimeoutId, text: reminder.text, reminderTime: Date.now() + newDelay });
    return res.status(200).json({ message: "Reminder snoozed for 5 minutes" });
});

server.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});

