import React from 'react';

export default function ProductDetailsModal({ open, product, onClose }) {
    if (!open) return null;

    return (
        <div className="backdrop" onMouseDown={onClose}>
            <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                <div className="modal__header">
                    <div className="modal__title">Товар #{product?.id?.slice?.(0, 6) || ''}</div>
                    <button className="iconBtn" onClick={onClose} aria-label="Закрыть">
                        X
                    </button>
                </div>
                <div className="form">
                    <div className="label">
                        Title
                        <div className="input">{product?.title || '—'}</div>
                    </div>
                    <div className="label">
                        Category
                        <div className="input">{product?.category || '—'}</div>
                    </div>
                    <div className="label">
                        Description
                        <div className="input">{product?.description || '—'}</div>
                    </div>
                    <div className="label">
                        Price
                        <div className="input">{product?.price != null ? `${product.price} руб.` : '—'}</div>
                    </div>
                    <div className="modal__footer">
                        <button type="button" className="btn" onClick={onClose}>
                            Закрыть
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

