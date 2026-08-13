import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import Corretoras from './pages/Corretoras';
import Acoes from './pages/Acoes';
import Carteiras from './pages/Carteiras';
import Login from './pages/Login';
import { isAuthenticated } from './services/auth';

import './styles/index.css';

const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

const PublicRoute = ({ children }) => {
    if (isAuthenticated()) {
        return <Navigate to="/" replace />;
    }

    return children;
};

function App() {
    return (
        <Router>
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
                            <Dashboard />
                        </ProtectedRoute>
                    )}
                />

                <Route
                    path="/corretoras"
                    element={(
                        <ProtectedRoute>
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
                            <Carteiras />
                        </ProtectedRoute>
                    )}
                />

                <Route path="/dashboard" element={<Navigate to="/" replace />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
}

export default App;
