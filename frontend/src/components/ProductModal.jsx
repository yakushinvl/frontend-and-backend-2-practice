import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [name, setName] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [stock, setStock] = useState('');
    const [rating, setRating] = useState('');

    useEffect(() => {
        if (!open) return;
        if (initialProduct) {
            setName(initialProduct.name || '');
            setCategory(initialProduct.category || '');
            setDescription(initialProduct.description || '');
            setPrice(initialProduct.price != null ? String(initialProduct.price) : '');
            setStock(initialProduct.stock != null ? String(initialProduct.stock) : '');
            setRating(initialProduct.rating != null ? String(initialProduct.rating) : '');
        } else {
            setName('');
            setCategory('');
            setDescription('');
            setPrice('');
            setStock('');
            setRating('');
        }
    }, [open, initialProduct]);

    if (!open) return null;

    const title = mode === 'edit' ? 'Редактирование товара' : 'Создание товара';

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedName = name.trim();
        const parsedPrice = Number(price);
        const parsedStock = stock === '' ? 0 : Number(stock);
        const parsedRating = rating === '' ? null : Number(rating);

        if (!trimmedName) {
            alert('Введите название товара');
            return;
        }
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            alert('Введите корректную цену');
            return;
        }
        if (!Number.isInteger(parsedStock) || parsedStock < 0) {
            alert('Введите корректное количество на складе');
            return;
        }
        onSubmit({
            id: initialProduct?.id,
            name: trimmedName,
            category: category.trim(),
            description: description.trim(),
            price: parsedPrice,
            stock: parsedStock,
            rating: parsedRating,
        });
    };

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal__header">
                    <div className="modal__title">{title}</div>
                    <button className="iconBtn" onClick={onClose} aria-label="Закрыть">X</button>
                </div>
                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Название *
                        <input
                            className="input"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Например, Футболка"
                            autoFocus
                        />
                    </label>
                    <label className="label">
                        Категория
                        <input
                            className="input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="Одежда, обувь..."
                        />
                    </label>
                    <label className="label">
                        Описание
                        <textarea
                            className="input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Краткое описание"
                            rows="2"
                        />
                    </label>
                    <label className="label">
                        Цена *
                        <input
                            className="input"
                            type="number"
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            placeholder="1500"
                            min="0.01"
                            step="0.01"
                        />
                    </label>
                    <label className="label">
                        Количество на складе
                        <input
                            className="input"
                            type="number"
                            value={stock}
                            onChange={(e) => setStock(e.target.value)}
                            placeholder="10"
                            min="0"
                            step="1"
                        />
                    </label>
                    <label className="label">
                        Рейтинг
                        <input
                            className="input"
                            type="number"
                            value={rating}
                            onChange={(e) => setRating(e.target.value)}
                            placeholder="4.5"
                            min="0"
                            max="5"
                            step="0.1"
                        />
                    </label>
                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>Отмена</button>
                        <button type="submit" className="btn btn--primary">
                            {mode === 'edit' ? 'Сохранить' : 'Создать'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}