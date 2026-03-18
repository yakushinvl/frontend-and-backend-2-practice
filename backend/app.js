const express = require('express');
const { nanoid } = require('nanoid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const app = express();
const port = 3000;

app.use(express.json());
app.use(cors({ origin: 'http://localhost:3001' }));

app.use((req, res, next) => {
    res.on('finish', () => {
        console.log(`[${new Date().toISOString()}] [${req.method}] ${res.statusCode} ${req.path}`);
        if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
            console.log('Body:', req.body);
        }
    });
    next();
});

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

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: 'Продукет не найден' });
        return null;
    }
    return product;
}

function findUserByEmail(email) {
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

async function hashPassword(password) {
    const rounds = 10;
    return bcrypt.hash(password, rounds);
}

async function verifyPassword(password, passwordHash) {
    return bcrypt.compare(password, passwordHash);
}

function generateAccessToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email },
        ACCESS_SECRET,
        { expiresIn: ACCESS_EXPIRES_IN }
    );
}

function generateRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, email: user.email },
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
        req.user = jwt.verify(token, ACCESS_SECRET); // { sub, email, iat, exp }
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Неправильный или просроченный токен' });
    }
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
                        id: { type: 'string', example: 'ab12cd' },
                        title: { type: 'string', example: 'Футболка' },
                        category: { type: 'string', example: 'Одежда' },
                        description: { type: 'string', example: 'Топовая футболка' },
                        price: { type: 'number', example: 1500 },
                    },
                },
                User: {
                    type: 'object',
                    required: ['id', 'email', 'first_name', 'last_name'],
                    properties: {
                        id: { type: 'string', example: 'u1a2b3' },
                        email: { type: 'string', example: 'ivan@example.com' },
                        first_name: { type: 'string', example: 'Иван' },
                        last_name: { type: 'string', example: 'Иванов' },
                    },
                },
            },
        },
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Регистрация пользователя
 *     description: Создает нового пользователя (email как логин), пароль хешируется bcrypt
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, first_name, last_name, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@example.com
 *               first_name:
 *                 type: string
 *                 example: Иван
 *               last_name:
 *                 type: string
 *                 example: Иванов
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       201:
 *         description: Пользователь создан
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/User'
 *                 - type: object
 *                   properties:
 *                     password:
 *                       type: string
 *                       description: Хеш пароля (для практики)
 *       400:
 *         description: Некорректные данные
 *       409:
 *         description: Email уже занят
 */
app.post('/api/auth/register', async (req, res, next) => {
    try {
        const { email, first_name, last_name, password } = req.body;
        if (!email || !first_name || !last_name || !password) {
            return res.status(400).json({ error: 'Почта, имя, фамилия и пароль обязательны' });
        }
        if (typeof email !== 'string' || !email.includes('@')) {
            return res.status(400).json({ error: 'Это не почта' });
        }
        if (findUserByEmail(email)) {
            return res.status(409).json({ error: 'Почта уже зарегистрирована' });
        }
        const user = {
            id: nanoid(6),
            email: email.trim(),
            first_name: String(first_name).trim(),
            last_name: String(last_name).trim(),
            password: await hashPassword(String(password)),
        };
        users.push(user);
        res.status(201).json(user);
    } catch (err) {
        next(err);
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Вход в систему
 *     description: Проверяет email и пароль пользователя
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: ivan@example.com
 *               password:
 *                 type: string
 *                 example: qwerty123
 *     responses:
 *       200:
 *         description: Успешная авторизация
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 login:
 *                   type: boolean
 *                   example: true
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: Отсутствуют обязательные поля
 *       401:
 *         description: Неверные учетные данные
 *       404:
 *         description: Пользователь не найден
 */
app.post('/api/auth/login', async (req, res, next) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Почта и пароль обязательны' });
        }
        const user = findUserByEmail(String(email));
        if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Обновление пары токенов
 *     description: Получает refresh-токен из заголовков и выдаёт новую пару access+refresh (ротация)
 *     tags: [Auth]
 *     parameters:
 *       - in: header
 *         name: x-refresh-token
 *         required: false
 *         schema:
 *           type: string
 *         description: "Refresh-токен (можно передать и через Authorization: Bearer <refreshToken>)"
 *       - in: header
 *         name: Authorization
 *         required: false
 *         schema:
 *           type: string
 *         description: "Bearer <refreshToken>"
 *     responses:
 *       200:
 *         description: Новая пара токенов
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - accessToken
 *                 - refreshToken
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *       400:
 *         description: Отсутствует refresh-токен
 *       401:
 *         description: Refresh-токен невалиден или неактуален
 */
app.post('/api/auth/refresh', (req, res) => {
    const refreshTokenFromHeader = req.headers['x-refresh-token'] || req.headers['refresh-token'];
    const authHeader = req.headers.authorization || '';
    const [scheme, bearerToken] = authHeader.split(' ');
    const refreshToken = String(refreshTokenFromHeader || (scheme === 'Bearer' ? bearerToken : '')).trim();

    if (!refreshToken) {
        return res.status(400).json({ error: 'refreshToken is required' });
    }
    if (!refreshTokens.has(refreshToken)) {
        return res.status(401).json({ error: 'Invalid refresh token' });
    }

    try {
        const payload = jwt.verify(refreshToken, REFRESH_SECRET);
        const user = users.find((u) => u.id === payload.sub);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        // Ротация refresh-токена: старый удаляем, новый создаём
        refreshTokens.delete(refreshToken);
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);
        refreshTokens.add(newRefreshToken);

        return res.json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired refresh token' });
    }
});

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Текущий пользователь
 *     description: Валидирует JWT и возвращает текущего пользователя
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Данные пользователя
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Нет токена или токен невалиден
 *       404:
 *         description: Пользователь не найден
 */
app.get('/api/auth/me', authMiddleware, (req, res) => {
    const userId = req.user?.sub;
    const user = users.find((u) => u.id === userId);
    if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
    const { password: _pw, ...safeUser } = user;
    res.json(safeUser);
});

/**
 * @swagger
 * /api/products:
 *   get:
 *     summary: Возвращает список всех товаров
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: Список товаров
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */
app.get('/api/products', (req, res) => {
    res.json(products);
});

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     summary: Возвращает товар по ID
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       200:
 *         description: Данные товара
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Товар не найден
 */
app.get('/api/products/:id', authMiddleware, (req, res) => {
    const product = findProductOr404(req.params.id, res);
    if (product) res.json(product);
});

/**
 * @swagger
 * /api/products:
 *   post:
 *     summary: Создаёт новый товар
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - price
 *             properties:
 *               name:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       201:
 *         description: Созданный товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Неверные данные
 */
app.post('/api/products', (req, res) => {
    const { title, category, description, price } = req.body;
    const fallbackTitle = req.body?.name;
    const actualTitle = title ?? fallbackTitle;
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
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   put:
 *     summary: Обновляет параметры товара
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               category:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               stock:
 *                 type: integer
 *               rating:
 *                 type: number
 *     responses:
 *       200:
 *         description: Обновлённый товар
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       400:
 *         description: Нет полей для обновления
 *       404:
 *         description: Товар не найден
 */
function updateProductHandler(req, res) {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { title, category, description, price } = req.body;
    const fallbackTitle = req.body?.name;
    const actualTitle = title ?? fallbackTitle;

    if (actualTitle === undefined && category === undefined && description === undefined && price === undefined) {
        return res.status(400).json({ error: 'Нечего изменять' });
    }

    if (actualTitle !== undefined) product.title = String(actualTitle).trim();
    if (category !== undefined) product.category = String(category);
    if (description !== undefined) product.description = String(description);
    if (price !== undefined) product.price = Number(price);

    res.json(product);
}

app.put('/api/products/:id', authMiddleware, updateProductHandler);
// Алиас на случай, если фронт/клиенты ещё отправляют PATCH
app.patch('/api/products/:id', authMiddleware, updateProductHandler);

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID товара
 *     responses:
 *       204:
 *         description: Товар успешно удалён
 *       404:
 *         description: Товар не найден
 */
app.delete('/api/products/:id', authMiddleware, (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: 'Продукт не найден' });
    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: '404' });
});

app.use((err, req, res) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Ошибка серевера' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger UI at http://localhost:${port}/api-docs`);
});