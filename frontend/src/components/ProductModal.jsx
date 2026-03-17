import React, { useEffect, useState } from 'react';

export default function ProductModal({ open, mode, initialProduct, onClose, onSubmit }) {
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');

    useEffect(() => {
        if (!open) return;
        if (initialProduct) {
            setTitle(initialProduct.title || '');
            setCategory(initialProduct.category || '');
            setDescription(initialProduct.description || '');
            setPrice(initialProduct.price != null ? String(initialProduct.price) : '');
        } else {
            setTitle('');
            setCategory('');
            setDescription('');
            setPrice('');
        }
    }, [open, initialProduct]);

    if (!open) return null;

    const modalTitle = mode === 'edit' ? 'Редактирование товара' : 'Создание товара';

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmedTitle = title.trim();
        const parsedPrice = Number(price);

        if (!trimmedTitle) {
            alert('Введите название товара');
            return;
        }
        if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
            alert('Введите корректную цену');
            return;
        }
        onSubmit({
            id: initialProduct?.id,
            title: trimmedTitle,
            category: category.trim(),
            description: description.trim(),
            price: parsedPrice,
        });
    };

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal__header">
                    <div className="modal__title">{modalTitle}</div>
                    <button className="iconBtn" onClick={onClose} aria-label="Закрыть">X</button>
                </div>
                <form className="form" onSubmit={handleSubmit}>
                    <label className="label">
                        Название *
                        <input
                            className="input"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            autoFocus
                        />
                    </label>
                    <label className="label">
                        Категория
                        <input
                            className="input"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                        />
                    </label>
                    <label className="label">
                        Описание
                        <textarea
                            className="input"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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