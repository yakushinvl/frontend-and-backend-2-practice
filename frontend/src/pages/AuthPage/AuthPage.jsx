import React, { useMemo, useState } from 'react';
import './AuthPage.scss';
import { api } from '../../api';

export default function AuthPage({ onAuthed }) {
    const [mode, setMode] = useState('login');
    const isLogin = mode === 'login';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [role, setRole] = useState('user'); // user | seller | admin
    const [loading, setLoading] = useState(false);

    const canSubmit = useMemo(() => {
        if (!email.trim() || !password) return false;
        return !(!isLogin && (!firstName.trim() || !lastName.trim()));

    }, [email, password, firstName, lastName, isLogin]);

    const submit = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;
        try {
            setLoading(true);
            if (isLogin) {
                await api.login({ email: email.trim(), password });
            } else {
                await api.register({
                    email: email.trim(),
                    first_name: firstName.trim(),
                    last_name: lastName.trim(),
                    password,
                    role,
                });
                await api.login({ email: email.trim(), password });
            }
            onAuthed?.();
        } catch (err) {
            console.error(err);
            alert('Ошибка авторизации. Проверьте данные');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page authPage">
            <main className="main">
                <div className="container authContainer">
                    <div className="authHeader">
                        <h1 className="title">Practice Auth</h1>
                        <div className="segmented">
                            <button
                                className={`segmented__btn ${isLogin ? 'isActive' : ''}`}
                                onClick={() => setMode('login')}
                                type="button"
                            >
                                Вход
                            </button>
                            <button
                                className={`segmented__btn ${!isLogin ? 'isActive' : ''}`}
                                onClick={() => setMode('register')}
                                type="button"
                            >
                                Регистрация
                            </button>
                        </div>
                    </div>

                    <div className="authCard">
                        <form className="form" onSubmit={submit}>
                            {!isLogin && (
                                <>
                                    <label className="label">
                                        Имя *
                                        <input
                                            className="input"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Иван"
                                        />
                                    </label>
                                    <label className="label">
                                        Фамилия *
                                        <input
                                            className="input"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Иванов"
                                        />
                                    </label>

                                    <label className="label">
                                        Роль
                                        <select
                                            className="input"
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                        >
                                            <option value="user">Пользователь</option>
                                            <option value="seller">Продавец</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    </label>
                                </>
                            )}

                            <label className="label">
                                Email *
                                <input
                                    className="input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ivan@example.com"
                                    inputMode="email"
                                />
                            </label>
                            <label className="label">
                                Пароль *
                                <input
                                    className="input"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="qwerty123"
                                />
                            </label>

                            <div className="authActions">
                                <button className="btn btn--primary" disabled={!canSubmit || loading}>
                                    {loading ? 'Подождите...' : isLogin ? 'Войти' : 'Создать аккаунт'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    );
}

