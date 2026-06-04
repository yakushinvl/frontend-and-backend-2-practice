import React from 'react';

export default function ProductCard({ product, onEdit, onDelete, onDetails }) {
    return (
        <div className="productRow">
            <div className="productMain">
                <div className="productId">#{product.id.slice(0, 4)}</div>
                <div className="productName">{product.title}</div>
                <div className="productPrice">{product.price} руб.</div>
            </div>
            <div className="productActions">
                <button className="btn" onClick={() => onDetails?.(product.id)}>
                    Подробнее
                </button>
                {onEdit && (
                    <button className="btn" onClick={() => onEdit(product)}>
                        Редактировать
                    </button>
                )}
                {onDelete && (
                    <button className="btn btn--danger" onClick={() => onDelete(product.id)}>
                        Удалить
                    </button>
                )}
            </div>
        </div>
    );
}