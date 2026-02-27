import React from 'react';

export default function ProductCard({ product, onEdit, onDelete }) {
    return (
        <div className="productRow">
            <div className="productMain">
                <div className="productId">#{product.id.slice(0, 4)}</div>
                <div className="productName">{product.name}</div>
                <div className="productPrice">{product.price} руб.</div>
                <div className="productStock">Остаток: {product.stock}</div>
            </div>
            <div className="productActions">
                <button className="btn" onClick={() => onEdit(product)}>
                    Редактировать
                </button>
                <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
                    Удалить
                </button>
            </div>
        </div>
    );
}