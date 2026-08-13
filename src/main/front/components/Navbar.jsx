import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../services/auth';

const Navbar = ({ title }) => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    return (
        <header className="header">
            <h1>{title}</h1>
            <nav className="nav-links">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                    Dashboard
                </NavLink>
                <NavLink to="/carteiras" className={({ isActive }) => isActive ? 'active' : ''}>
                    Carteira
                </NavLink>
                <NavLink to="/corretoras" className={({ isActive }) => isActive ? 'active' : ''}>
                    Corretoras
                </NavLink>
                <NavLink to="/acoes" className={({ isActive }) => isActive ? 'active' : ''}>
                    Ações
                </NavLink>
            </nav>
            <div className="user-menu">
                <span className="badge role-badge">{currentUser?.role || 'USER'}</span>
                <button type="button" className="btn btn-secondary btn-small" onClick={handleLogout}>
                    Sair
                </button>
            </div>
        </header>
    );
};

export default Navbar;
