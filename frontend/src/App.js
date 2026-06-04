import ProductsPage from './pages/ProductsPage/ProductsPage';
import AuthPage from './pages/AuthPage/AuthPage';
import React, { useEffect, useState } from 'react';

function App() {
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');
        setAuthed(Boolean(accessToken && refreshToken));
    }, []);

    return (
        <div className="App">
            {authed ? (
                <ProductsPage onLogout={() => setAuthed(false)} />
            ) : (
                <AuthPage onAuthed={() => setAuthed(true)} />
            )}
        </div>
    );
}

export default App;