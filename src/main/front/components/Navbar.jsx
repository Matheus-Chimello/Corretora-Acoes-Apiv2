import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { getCurrentUser, logout } from '../services/auth';

const linksAdmin = [
    { to: '/admin/usuarios', label: 'Administração' },
    { to: '/admin/corretoras', label: 'Corretoras' }
];

const linksUsuario = [
    { to: '/', label: 'Visão geral' },
    { to: '/carteiras', label: 'Carteira' },
    { to: '/corretoras', label: 'Corretoras' },
    { to: '/acoes', label: 'Ações' }
];

const Navbar = ({ title }) => {
    const navigate = useNavigate();
    const currentUser = getCurrentUser();
    const isAdmin = currentUser?.role === 'ADMIN';
    const links = isAdmin ? linksAdmin : linksUsuario;
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
                <NavLink to={links[0].to} end className="brand"
                    aria-label={isAdmin ? 'Ir para a administração' : 'Ir para a visão geral'}>
                    <span className="brand-mark" aria-hidden="true">CA</span>
                    <span className="brand-name">Corretora <strong>Ações</strong></span>
                </NavLink>
                <div className="page-title">
                    <span>{isAdmin ? 'Controle de acesso' : 'Carteira'}</span>
                    <h1>{title}</h1>
                </div>
            </div>
            <nav className="nav-links" aria-label={isAdmin ? 'Menu do administrador' : 'Menu principal'}>
                {links.map(({ to, label }) => (
                    <NavLink key={to} to={to} end className={({ isActive }) => isActive ? 'active' : ''}>
                        {label}
                    </NavLink>
                ))}
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
