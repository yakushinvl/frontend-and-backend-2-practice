const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const { createClient } = require('redis');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001' }));

const redisClient = createClient({
    url: process.env.REDIS_URL || 'redis://127.0.0.1:6379'
});

redisClient.on('error', (err) => {
    console.error('Ошибка Redis:', err);
});

async function initRedis() {
    try {
        await redisClient.connect();
        console.log('Redis подключен');
    } catch (err) {
        console.error('Не удалось подключиться к Redis:', err.message);
    }
}

const USERS_CACHE_TTL = 60;
const PRODUCTS_CACHE_TTL = 600;

function cacheMiddleware(keyBuilder, ttl) {
    return async (req, res, next) => {
        try {
            const key = keyBuilder(req);
            const cachedData = await redisClient.get(key);
            if (cachedData) {
                return res.json({
                    source: 'cache',
                    data: JSON.parse(cachedData)
                });
            }
            req.cacheKey = key;
            req.cacheTTL = ttl;
            next();
        } catch (err) {
            console.error('Ошибка кэш-middleware:', err);
            next();
        }
    };
}

async function saveToCache(key, data, ttl) {
    try {
        await redisClient.set(key, JSON.stringify(data), {
            EX: ttl
        });
    } catch (err) {
        console.error('Ошибка сохранения в кэш:', err);
    }
}

async function invalidateUsersCache(userId = null) {
    try {
        await redisClient.del('users:all');
        if (userId) {
            await redisClient.del(`users:${userId}`);
        }
    } catch (err) {
        console.error('Ошибка инвалидации кэша пользователей:', err);
    }
}

async function invalidateProductsCache(productId = null) {
    try {
        await redisClient.del('products:all');
        if (productId) {
            await redisClient.del(`products:${productId}`);
        }
    } catch (err) {
        console.error('Ошибка инвалидации кэша товаров:', err);
    }
}

let products = [
    { id: nanoid(6), title: 'Товар 1', category: 'Категория 1', description: 'Описание 1', price: 1 },
    { id: nanoid(6), title: 'Товар 2', category: 'Категория 2', description: 'Описание 2', price: 1 },
    { id: nanoid(6), title: 'Товар 3', category: 'Категория 3', description: 'Описание 3', price: 1 },
    { id: nanoid(6), title: 'Товар 4', category: 'Категория 4', description: 'Описание 4', price: 1 },
    { id: nanoid(6), title: 'Товар 5', category: 'Категория 5', description: 'Описание 5', price: 1 },
];

let users = [];

const ACCESS_SECRET = process.env.ACCESS_SECRET || process.env.JWT_SECRET || 'access_secret';
const REFRESH_SECRET = process.env.REFRESH_SECRET || 'refresh_secret';

const ACCESS_EXPIRES_IN = process.env.ACCESS_EXPIRES_IN || '15m';
const REFRESH_EXPIRES_IN = process.env.REFRESH_EXPIRES_IN || '7d';

const refreshTokens = new Set();

const allowedRoles = ['user', 'seller', 'admin'];

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: 'Продукт не найден' });
        return null;
    }
    return product;
}

function findUserByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

async function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role || 'user' },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email, role: user.role || 'user' },
        REFRESH_SECRET,
        { expiresIn: REFRESH_EXPIRES_IN }
    );
}

function authMiddleware(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({ error: 'Ошибка заголовка авторизации' });
    }
    try {
        const payload = jwt.verify(token, ACCESS_SECRET);
        const user = users.find((u) => u.id === payload.sub);
        if (!user || user.isBlocked) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        req.user = payload;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Неправильный или просроченный токен' });
    }
}

function roleMiddleware(allowedRolesList) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !allowedRolesList.includes(role)) {
            return res.status(403).json({ error: 'Доступ запрещен' });
        }
        next();
    };
}

function getSafeUser(user) {
    const { password: _pw, ...safeUser } = user;
    return safeUser;
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Practice API',
            version: '1.0.0',
            description: 'Практика: базовая аутентификация и CRUD товаров',
        },
        servers: [{ url: `http://localhost:${port}` }],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                Product: {
                    type: 'object',
                    required: ['id', 'title', 'category', 'description', 'price'],
                    properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        category: { type: 'string' },
                        description: { type: 'string' },
                        price: { type: 'number' },
                    },
                },
                User: {
                    type: 'object',
                    required: ['id', 'email', 'first_name', 'last_name'],
                    properties: {
                        id: { type: 'string' },
                        email: { type: 'string' },
                        first_name: { type: 'string' },
                        last_name: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { email, first_name, last_name, password, role } = req.body;
        if (!email || !first_name || !last_name || !password) {
            return res.status(400).json({ error: 'Почта, имя, фамилия и пароль обязательны' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Некорректный адрес почты' });
        }
        if (findUserByEmail(email)) {
            return res.status(409).json({ error: 'Почта уже зарегистрирована' });
        }

        const actualRole = typeof role === 'string' ? role : 'user';
        if (!allowedRoles.includes(actualRole)) {
            return res.status(400).json({ error: 'Недопустимая роль' });
        }

        const user = {
            id: nanoid(6),
            email: email.trim(),
            first_name: String(first_name).trim(),
            last_name: String(last_name).trim(),
            password: await hashPassword(String(password)),
            role: actualRole,
            isBlocked: false,
        };
        users.push(user);
        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
});

app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Почта и пароль обязательны' });
        }
        const user = findUserByEmail(String(email));
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

        if (user.isBlocked) return res.status(403).json({ error: 'Доступ запрещен' });

        const ok = await verifyPassword(String(password), user.password);
        if (!ok) return res.status(401).json({ error: 'Ошибка авторизации' });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);
        refreshTokens.add(refreshToken);

        const { password: _pw, ...safeUser } = user;
        res.status(200).json({ login: true, accessToken, refreshToken, user: safeUser });
    } catch (err) {
        next(err);
    }
});

app.post('/api/auth/refresh', (req, res) => {
    const refreshTokenFromHeader = req.headers['x-refresh-token'] || req.headers['refresh-token'];
    const authHeader = req.headers.authorization || '';
    const [scheme, bearerToken] = authHeader.split(' ');
    const refreshToken = String(refreshTokenFromHeader || (scheme === 'Bearer' ? bearerToken : '')).trim();

    if (!refreshToken) {
        return res.status(400).json({ error: 'Требуется refresh-токен' });
    }
    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Невалидный refresh-токен' });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find((u) => u.id === payload.sub);
        if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
        if (user.isBlocked) return res.status(401).json({ error: 'Пользователь заблокирован' });

        refreshTokens.delete(refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);

        return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.status(401).json({ error: 'Невалидный или просроченный refresh-токен' });
    }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
    const userId = req.user?.sub;
    const user = users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    res.json(getSafeUser(user));
});

app.get('/api/users', authMiddleware, roleMiddleware(['admin']), cacheMiddleware(() => 'users:all', USERS_CACHE_TTL), async (req, res) => {
    const data = users.map(getSafeUser);
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: 'server', data });
});

app.get('/api/users/:id', authMiddleware, roleMiddleware(['admin']), cacheMiddleware((req) => `users:${req.params.id}`, USERS_CACHE_TTL), async (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const data = getSafeUser(user);
    await saveToCache(req.cacheKey, data, req.cacheTTL);
    res.json({ source: 'server', data });
});

app.put('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

    const { email, first_name, last_name, role } = req.body;

    if (email !== undefined) {
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Некорректная почта' });
        }
        const existing = users.find(
            (u) => u.email.toLowerCase() === String(email).toLowerCase() && u.id !== user.id
        );
        if (existing) return res.status(409).json({ error: 'Почта уже занята' });
        user.email = String(email).trim();
    }
    if (first_name !== undefined) user.first_name = String(first_name).trim();
    if (last_name !== undefined) user.last_name = String(last_name).trim();
    if (role !== undefined) {
        if (!allowedRoles.includes(String(role))) {
            return res.status(400).json({ error: 'Недопустимая роль' });
        }
        user.role = String(role);
    }

    await invalidateUsersCache(user.id);
    res.json(getSafeUser(user));
});

app.delete('/api/users/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const user = users.find((u) => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    user.isBlocked = true;
    await invalidateUsersCache(user.id);
    res.status(204).send();
});

app.get('/api/products', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), cacheMiddleware(() => 'products:all', PRODUCTS_CACHE_TTL), async (req, res) => {
    await saveToCache(req.cacheKey, products, req.cacheTTL);
    res.json({ source: 'server', data: products });
});

app.get('/api/products/:id', authMiddleware, roleMiddleware(['user', 'seller', 'admin']), cacheMiddleware((req) => `products:${req.params.id}`, PRODUCTS_CACHE_TTL), async (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (product) {
        await saveToCache(req.cacheKey, product, req.cacheTTL);
        res.json({ source: 'server', data: product });
    }
});

app.post('/api/products', authMiddleware, roleMiddleware(['seller', 'admin']), async (req, res) => {
    const { title, category, description, price } = req.body;
    const actualTitle = title ?? req.body?.name;
    if (!actualTitle || price === undefined) {
        return res.status(400).json({ error: 'Название и цена обязательны' });
    }
    const newProduct = {
        id: nanoid(6),
        title: String(actualTitle).trim(),
        category: category ? String(category) : '',
        description: description ? String(description) : '',
        price: Number(price),
    };
    products.push(newProduct);
    await invalidateProductsCache();
    res.status(201).json(newProduct);
});

async function updateProductHandler(req, res) {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { title, category, description, price } = req.body;
    const actualTitle = title ?? req.body?.name;

    if (actualTitle === undefined && category === undefined && description === undefined && price === undefined) {
        return res.status(400).json({ error: 'Нечего изменять' });
    }

    if (actualTitle !== undefined) product.title = String(actualTitle).trim();
    if (category !== undefined) product.category = String(category);
    if (description !== undefined) product.description = String(description);
    if (price !== undefined) product.price = Number(price);

    await invalidateProductsCache(product.id);
    res.json(product);
}

app.put('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), updateProductHandler);
app.patch('/api/products/:id', authMiddleware, roleMiddleware(['seller', 'admin']), updateProductHandler);

app.delete('/api/products/:id', authMiddleware, roleMiddleware(['admin']), async (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: 'Продукт не найден' });
    products = products.filter(p => p.id !== id);
    await invalidateProductsCache(id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: 'Страница не найдена' });
});

app.use((err, req, res) => {
    console.error('Необработанная ошибка:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
});

initRedis().then(() => {
    app.listen(port, () => {
        console.log(`Сервер запущен на http://localhost:${port}`);
    });
});
