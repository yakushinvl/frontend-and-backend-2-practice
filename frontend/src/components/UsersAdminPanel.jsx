import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function UsersAdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [saving, setSaving] = useState(false);

    const loadUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api.getUsers();
            setUsers(data);
        } catch (err) {
            console.error(err);
            setError('Ошибка загрузки пользователей (нужны права admin)');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const openEdit = (user) => {
        setEditingUser(user);
        setEditOpen(true);
    };

    const closeEdit = () => {
        setEditOpen(false);
        setEditingUser(null);
    };

    const handleBlock = async (id) => {
        const ok = window.confirm('Заблокировать пользователя?');
        if (!ok) return;
        try {
            await api.blockUser(id);
            await loadUsers();
        } catch (err) {
            console.error(err);
            alert('Ошибка блокировки пользователя');
        }
    };

    const handleSave = async (payload) => {
        setSaving(true);
        try {
            await api.updateUser(editingUser.id, payload);
            await loadUsers();
            closeEdit();
        } catch (err) {
            console.error(err);
            alert('Ошибка обновления пользователя');
        } finally {
            setSaving(false);
        }
    };

    return (
        <section style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <h2 style={{ margin: 0, fontSize: 18 }}>Управление пользователями</h2>
                <button className="btn" onClick={loadUsers} disabled={loading}>
                    Обновить
                </button>
            </div>

            {loading ? (
                <div className="empty" style={{ marginTop: 12 }}>
                    Загрузка...
                </div>
            ) : error ? (
                <div className="empty" style={{ marginTop: 12 }}>
                    {error}
                </div>
            ) : users.length === 0 ? (
                <div className="empty" style={{ marginTop: 12 }}>
                    Пользователей пока нет
                </div>
            ) : (
                <div className="list" style={{ marginTop: 12 }}>
                    {users.map((u) => (
                        <div key={u.id} className="productRow" style={{ alignItems: 'flex-start' }}>
                            <div className="productMain" style={{ gap: 8, flexDirection: 'column', alignItems: 'flex-start' }}>
                                <div className="productId">#{u.id.slice(0, 4)}</div>
                                <div className="productName">{u.email}</div>
                                <div className="productPrice" style={{ opacity: 0.75 }}>
                                    {u.first_name} {u.last_name}
                                </div>
                                <div className="productPrice" style={{ opacity: 0.85 }}>
                                    Роль: {u.role}
                                </div>
                                <div className="productPrice" style={{ opacity: 0.85 }}>
                                    Статус: {u.isBlocked ? 'Заблокирован' : 'Активен'}
                                </div>
                            </div>
                            <div className="productActions" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <button className="btn" onClick={() => openEdit(u)}>
                                    Редактировать
                                </button>
                                <button
                                    className="btn btn--danger"
                                    onClick={() => handleBlock(u.id)}
                                    disabled={u.isBlocked}
                                >
                                    {u.isBlocked ? 'Заблокирован' : 'Заблокировать'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {editOpen && editingUser && (
                <div className="backdrop" onMouseDown={closeEdit}>
                    <div className="modal" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
                        <div className="modal__header">
                            <div className="modal__title">Редактирование пользователя</div>
                            <button className="iconBtn" onClick={closeEdit} aria-label="Закрыть">
                                X
                            </button>
                        </div>
                        <div className="form" style={{ padding: 16 }}>
                            <div className="label">
                                Email
                                <input
                                    className="input"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                />
                            </div>
                            <div className="label">
                                Имя
                                <input
                                    className="input"
                                    value={editingUser.first_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, first_name: e.target.value })}
                                />
                            </div>
                            <div className="label">
                                Фамилия
                                <input
                                    className="input"
                                    value={editingUser.last_name}
                                    onChange={(e) => setEditingUser({ ...editingUser, last_name: e.target.value })}
                                />
                            </div>
                            <div className="label">
                                Роль
                                <select
                                    className="input"
                                    value={editingUser.role}
                                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                                >
                                    <option value="user">Пользователь</option>
                                    <option value="seller">Продавец</option>
                                    <option value="admin">Администратор</option>
                                </select>
                            </div>

                            <div className="modal__footer" style={{ justifyContent: 'space-between' }}>
                                <button type="button" className="btn" onClick={closeEdit} disabled={saving}>
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--primary"
                                    onClick={() =>
                                        handleSave({
                                            email: editingUser.email,
                                            first_name: editingUser.first_name,
                                            last_name: editingUser.last_name,
                                            role: editingUser.role,
                                        })
                                    }
                                    disabled={saving}
                                >
                                    {saving ? 'Сохранение...' : 'Сохранить'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

