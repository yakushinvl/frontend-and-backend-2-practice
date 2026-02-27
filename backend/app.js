const express = require('express');
const { nanoid } = require('nanoid');
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
    { id: nanoid(6), name: 'Товар 1', category: 'Категория 1', description: 'Описание 1', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 2', category: 'Категория 2', description: 'Описание 2', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 3', category: 'Категория 3', description: 'Описание 3', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 4', category: 'Категория 4', description: 'Описание 4', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 5', category: 'Категория 5', description: 'Описание 5', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 6', category: 'Категория 6', description: 'Описание 6', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 7', category: 'Категория 7', description: 'Описание 7', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 8', category: 'Категория 8', description: 'Описание 8', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 9', category: 'Категория 9', description: 'Описание 9', price: 1, stock: 1, rating: 1},
    { id: nanoid(6), name: 'Товар 10', category: 'Категория 10', description: 'Описание 10', price: 1, stock: 1, rating: 1},
];

function findProductOr404(id, res) {
    const product = products.find(p => p.id === id);
    if (!product) {
        res.status(404).json({ error: 'Product not found' });
        return null;
    }
    return product;
}

const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        servers: [{ url: `http://localhost:${port}` }],
    },
    apis: ['./app.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

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
app.get('/api/products/:id', (req, res) => {
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
    const { name, category, description, price, stock, rating } = req.body;
    if (!name || price === undefined) {
        return res.status(400).json({ error: 'Название и цена обязательны для заполнения!' });
    }
    const newProduct = {
        id: nanoid(6),
        name: name.trim(),
        category: category || '',
        description: description || '',
        price: Number(price),
        stock: stock !== undefined ? Number(stock) : 0,
        rating: rating !== undefined ? Number(rating) : null,
    };
    products.push(newProduct);
    res.status(201).json(newProduct);
});

/**
 * @swagger
 * /api/products/{id}:
 *   patch:
 *     summary: Обновляет существующий товар
 *     tags: [Products]
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
app.patch('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const product = findProductOr404(id, res);
    if (!product) return;

    const { name, category, description, price, stock, rating } = req.body;
    if (name === undefined && category === undefined && description === undefined && price === undefined && stock === undefined && rating === undefined) {
        return res.status(400).json({ error: 'Нечего изменять' });
    }

    if (name !== undefined) product.name = name.trim();
    if (category !== undefined) product.category = category;
    if (description !== undefined) product.description = description;
    if (price !== undefined) product.price = Number(price);
    if (stock !== undefined) product.stock = Number(stock);
    if (rating !== undefined) product.rating = Number(rating);

    res.json(product);
});

/**
 * @swagger
 * /api/products/{id}:
 *   delete:
 *     summary: Удаляет товар
 *     tags: [Products]
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
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const exists = products.some(p => p.id === id);
    if (!exists) return res.status(404).json({ error: 'Product not found' });
    products = products.filter(p => p.id !== id);
    res.status(204).send();
});

app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Swagger UI at http://localhost:${port}/api-docs`);
});