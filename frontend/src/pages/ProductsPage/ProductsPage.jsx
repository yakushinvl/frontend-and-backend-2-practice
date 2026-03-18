import React, { useState, useEffect } from 'react';
import './ProductsPage.scss';
import ProductList from '../../components/ProductList';
import ProductModal from '../../components/ProductModal';
import ProductDetailsModal from '../../components/ProductDetailsModal';
import { api } from '../../api';

export default function ProductsPage({ onLogout }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingProduct, setEditingProduct] = useState(null);
    const [me, setMe] = useState(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [detailsProduct, setDetailsProduct] = useState(null);

    useEffect(() => {
        loadProducts();
        loadMe();
    }, []);

    const loadProducts = async () => {
        try {
            setLoading(true);
            const data = await api.getProducts();
            setProducts(data);
        } catch (err) {
            console.error(err);
            alert('Ошибка загрузки товаров');
        } finally {
            setLoading(false);
        }
    };

    const loadMe = async () => {
        try {
            const user = await api.me();
            setMe(user);
        } catch (err) {
            console.error(err);
            setMe(null);
        }
    };

    const openCreate = () => {
        setModalMode('create');
        setEditingProduct(null);
        setModalOpen(true);
    };

    const openEdit = (product) => {
        setModalMode('edit');
        setEditingProduct(product);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingProduct(null);
    };

    const handleDelete = async (id) => {
        const ok = window.confirm('Удалить товар?');
        if (!ok) return;
        try {
            await api.deleteProduct(id);
            setProducts((prev) => prev.filter((p) => p.id !== id));
        } catch (err) {
            console.error(err);
            alert('Ошибка удаления товара (нужна авторизация)');
        }
    };

    const handleDetails = async (id) => {
        try {
            const product = await api.getProductById(id);
            setDetailsProduct(product);
            setDetailsOpen(true);
        } catch (err) {
            console.error(err);
            alert('Ошибка получения товара по id (нужна авторизация)');
        }
    };

    const handleSubmitModal = async (payload) => {
        try {
            if (modalMode === 'create') {
                const newProduct = await api.createProduct(payload);
                setProducts((prev) => [...prev, newProduct]);
            } else {
                const updatedProduct = await api.updateProduct(payload.id, payload);
                setProducts((prev) =>
                    prev.map((p) => (p.id === payload.id ? updatedProduct : p))
                );
            }
            closeModal();
        } catch (err) {
            console.error(err);
            alert('Ошибка сохранения товара (для update нужна авторизация)');
        }
    };

    return (
        <div className="page">
            <main className="main">
                <div className="container">
                    <div className="toolbar">
                        <div>
                            <h1 className="title">Товары</h1>
                            <div style={{ opacity: 0.8, fontSize: 12, marginTop: 4 }}>
                                {me ? `Вы вошли как: ${me.email}` : 'Проверка токена...'}
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn--primary" onClick={openCreate}>
                                + Создать
                            </button>
                            <button
                                className="btn"
                                onClick={() => {
                                    api.logout();
                                    onLogout?.();
                                }}
                            >
                                Выйти
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="empty">Загрузка...</div>
                    ) : (
                        <ProductList
                            products={products}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onDetails={handleDetails}
                        />
                    )}
                </div>
            </main>

            <ProductModal
                open={modalOpen}
                mode={modalMode}
                initialProduct={editingProduct}
                onClose={closeModal}
                onSubmit={handleSubmitModal}
            />

            <ProductDetailsModal
                open={detailsOpen}
                product={detailsProduct}
                onClose={() => {
                    setDetailsOpen(false);
                    setDetailsProduct(null);
                }}
            />
        </div>
    );
}