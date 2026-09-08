import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getCurrentUser, logout } from '../services/auth';

const Navbar = ({ title }) => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const [sidebarRecolhida, setSidebarRecolhida] = useState(
        () => window.localStorage.getItem('sidebar-recolhida') === 'true'
    );

    useEffect(() => {
        document.body.classList.toggle('sidebar-is-collapsed', sidebarRecolhida);
        window.localStorage.setItem('sidebar-recolhida', String(sidebarRecolhida));

        return () => document.body.classList.remove('sidebar-is-collapsed');
    }, [sidebarRecolhida]);

    const handleLogout = () => {
        logout();
        navigate('/login', { replace: true });
    };

    const displayName = currentUser?.name || currentUser?.nome || currentUser?.email?.split('@')[0] || 'Perfil';

    return (
        <header className={`header${sidebarRecolhida ? ' sidebar-collapsed' : ''}`}>
            <button
                type="button"
                className="sidebar-toggle"
                onClick={() => setSidebarRecolhida((recolhida) => !recolhida)}
                aria-expanded={!sidebarRecolhida}
                aria-label={sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}
                title={sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            >
                {sidebarRecolhida ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
            </button>
            <div className="header-brand">
                <NavLink to="/" end className="brand" aria-label="Ir para a visão geral">
                    <span className="brand-mark" aria-hidden="true">CA</span>
                    <span className="brand-name">Corretora <strong>Ações</strong></span>
                </NavLink>
                <div className="page-title">
                    <span>Carteira</span>
                    <h1>{title}</h1>
                </div>
            </div>
            <nav className="nav-links">
                <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>
                    Visão geral
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
                <span className="user-name">{displayName}</span>
                <button type="button" className="btn btn-secondary btn-small" onClick={handleLogout}>
                    Sair
                </button>
            </div>
        </header>
    );
};

export default Navbar;
