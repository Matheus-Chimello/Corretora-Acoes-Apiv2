import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
    BriefcaseBusiness, CalendarDays, ChartNoAxesColumnIncreasing, Landmark, LogOut,
    PanelLeftClose, PanelLeftOpen, ShieldCheck, TrendingUp, UserRound
} from 'lucide-react';
import { getCurrentUser, logout } from '../services/auth';

const linksAdmin = [
    { to: '/admin/usuarios', label: 'Administração', icon: ShieldCheck },
    { to: '/admin/corretoras', label: 'Corretoras', icon: Landmark }
];

const linksUsuario = [
    { to: '/', label: 'Visão geral', icon: ChartNoAxesColumnIncreasing },
    { to: '/carteiras', label: 'Carteira', icon: BriefcaseBusiness },
    { to: '/resumo-mensal', label: 'Resumo mensal', icon: CalendarDays },
    { to: '/corretoras', label: 'Corretoras', icon: Landmark },
    { to: '/acoes', label: 'Ações', icon: TrendingUp }
];

const Navbar = ({ title, titleAction }) => {
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
    const sidebarLabel = sidebarRecolhida ? 'Expandir menu lateral' : 'Recolher menu lateral';

    return (
        <>
            <header className="header">
                <div className="header-brand">
                    <NavLink to={links[0].to} end className="brand"
                        aria-label={isAdmin ? 'Ir para a administração' : 'Ir para a visão geral'}>
                        <span className="brand-mark" aria-hidden="true">CA</span>
                        <span className="brand-name">Corretora <strong>Ações</strong></span>
                    </NavLink>
                    <button
                        type="button"
                        className="sidebar-toggle"
                        onClick={() => setSidebarRecolhida((recolhida) => !recolhida)}
                        aria-expanded={!sidebarRecolhida}
                        aria-label={sidebarLabel}
                        title={sidebarLabel}
                    >
                        {sidebarRecolhida ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
                    </button>
                </div>
                <nav className="nav-links" aria-label={isAdmin ? 'Menu do administrador' : 'Menu principal'}>
                    {links.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} end>
                            <Icon size={18} aria-hidden="true" />
                            {label}
                        </NavLink>
                    ))}
                </nav>
                <div className="user-menu">
                    <div className="user-profile">
                        <span className="user-avatar" aria-hidden="true">{Array.from(displayName)[0].toLocaleUpperCase('pt-BR')}</span>
                        <span className="user-name">{displayName}</span>
                    </div>
                    <NavLink to="/minha-conta" end className="user-menu-action">
                        <UserRound size={18} aria-hidden="true" />
                        Minha conta
                    </NavLink>
                    <button type="button" className="user-menu-action" onClick={handleLogout}>
                        <LogOut size={18} aria-hidden="true" />
                        Sair
                    </button>
                </div>
            </header>
            <div className="page-title">
                <h1>{title}</h1>
                {titleAction}
            </div>
        </>
    );
};

export default Navbar;
