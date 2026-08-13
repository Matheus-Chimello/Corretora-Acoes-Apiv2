import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';

const formatCurrency = (value) => {
    const numericValue = Number(value || 0);
    return numericValue.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
};

const Dashboard = () => {
    const [stats, setStats] = useState({
        corretorasCount: 0,
        acoesCount: 0,
        carteirasCount: 0,
        saldoAcao: 0
    });

    useEffect(() => {
        apiFetch('/api/dashboard/stats')
            .then((response) => response.json())
            .then((data) => setStats(data))
            .catch((error) => console.error('Erro ao buscar dados:', error));
    }, []);

    return (
        <div className="container">
            <Navbar title="Gestão Financeira" />

            <main className="dashboard-cards">
                <Link to="/carteiras" className="card">
                    <h2>Carteira Principal</h2>
                    <p>Saldo consolidado das posições em carteira.</p>
                    <div className="stat stat-money">{formatCurrency(stats.saldoAcao)}</div>
                </Link>

                <Link to="/corretoras" className="card">
                    <h2>Corretoras Cadastradas</h2>
                    <p>Total de corretoras cadastradas no sistema.</p>
                    <div className="stat">{stats.corretorasCount}</div>
                </Link>

                <Link to="/acoes" className="card acoes">
                    <h2>Ações Cadastradas</h2>
                    <p>Total de ações com quantidade disponível em carteira.</p>
                    <div className="stat">{stats.acoesCount}</div>
                </Link>
            </main>
        </div>
    );
};

export default Dashboard;
