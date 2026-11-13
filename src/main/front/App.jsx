import React, { useEffect, useLayoutEffect, useState } from 'react';
import { HashRouter as Router, Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Corretoras from './pages/Corretoras';
import Acoes from './pages/Acoes';
import Carteiras from './pages/Carteiras';
import Login from './pages/Login';
import { AUTH_SESSION_ENDED_EVENT, AUTH_STORAGE_KEY, getCurrentUser, isAuthenticated } from './services/auth';
import { notifyMarketTickerUpdate } from './services/marketTicker';
import MarketTicker from './components/MarketTicker';
import Navbar from './components/Navbar';
import Usuarios from './pages/Usuarios';
import CadastroCorretora from './pages/CadastroCorretora';
import MinhaConta from './pages/MinhaConta';

import './styles/index.css';

const TEMA_STORAGE_KEY = 'tema-site';
const PRIVACIDADE_STORAGE_KEY = 'modo-privacidade';

const ProtectedRoute = ({ children, adminOnly = false, adminRedirect = '/admin/usuarios' }) => {
    const user = getCurrentUser();
    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const isAdmin = user.role === 'ADMIN';
    if (adminOnly && !isAdmin) {
        return <div className="container">
            <Navbar title="Acesso restrito" />
            <main className="page-content">
                <p role="alert" className="alert alert-error">Esta área é exclusiva para administradores.</p>
                <Link to="/" className="btn btn-secondary">Voltar à visão geral</Link>
            </main>
        </div>;
    }

    if (!adminOnly && isAdmin && adminRedirect) {
        return <Navigate to={adminRedirect} replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    if (isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

const RedirecionarSessaoEncerrada = () => {
    const navigate = useNavigate();
    useEffect(() => {
        const redirecionar = () => navigate('/login', { replace: true, state: { sessaoEncerrada: true } });
        const aoRemoverSessaoEmOutraAba = (event) => {
            if (event.key !== AUTH_STORAGE_KEY || event.newValue !== null || isAuthenticated()) return;
            notifyMarketTickerUpdate();
            navigate('/login', { replace: true });
        };
        window.addEventListener(AUTH_SESSION_ENDED_EVENT, redirecionar);
        window.addEventListener('storage', aoRemoverSessaoEmOutraAba);
        return () => {
            window.removeEventListener(AUTH_SESSION_ENDED_EVENT, redirecionar);
            window.removeEventListener('storage', aoRemoverSessaoEmOutraAba);
        };
    }, [navigate]);
    return null;
};

function App() {
    const [tema, setTema] = useState(() => localStorage.getItem(TEMA_STORAGE_KEY) === 'dark' ? 'dark' : 'light');
    const [modoPrivacidade, setModoPrivacidade] = useState(
        () => sessionStorage.getItem(PRIVACIDADE_STORAGE_KEY) === 'true'
    );

    useLayoutEffect(() => {
        document.documentElement.dataset.theme = tema;
    }, [tema]);

    const alterarTema = (novoTema) => {
        setTema(novoTema);
        localStorage.setItem(TEMA_STORAGE_KEY, novoTema);
    };

    const alternarPrivacidade = () => {
        const ativo = !modoPrivacidade;
        setModoPrivacidade(ativo);
        sessionStorage.setItem(PRIVACIDADE_STORAGE_KEY, String(ativo));
    };

    return (
        <Router>
            <RedirecionarSessaoEncerrada />
            <MarketTicker />
            <Routes>
                <Route
                    path="/login"
                    element={(
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    )}
                />

                <Route
                    path="/"
                    element={(
                        <ProtectedRoute>
                            <Dashboard modoPrivacidade={modoPrivacidade} aoAlternarPrivacidade={alternarPrivacidade} />
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path="/corretoras"
                    element={(
                        <ProtectedRoute adminRedirect="/admin/corretoras">
                            <Corretoras />
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path="/acoes"
                    element={(
                        <ProtectedRoute>
                            <Acoes />
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path="/carteiras"
                    element={(
                        <ProtectedRoute>
                            <Carteiras modoPrivacidade={modoPrivacidade} aoAlternarPrivacidade={alternarPrivacidade} />
                        </ProtectedRoute>
                    )}
                />

                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="/minha-conta" element={(
                    <ProtectedRoute adminRedirect={null}>
                        <MinhaConta tema={tema} aoAlterarTema={alterarTema} />
                    </ProtectedRoute>
                )} />
                <Route path="/admin/usuarios" element={<ProtectedRoute adminOnly><Usuarios /></ProtectedRoute>} />
                <Route path="/admin/corretoras" element={<ProtectedRoute adminOnly><CadastroCorretora /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
