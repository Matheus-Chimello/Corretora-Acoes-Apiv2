import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../services/auth';

const Login = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const [mensagem, setMensagem] = useState('');

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMensagem('');

        try {
            await login(formData.email, formData.password);
            navigate('/', { replace: true });
        } catch (error) {
            setMensagem(error.message);
        }
    };

    return (
        <div className="login-page">
            <div className="login-layout">
                <section className="login-context" aria-label="Corretora de Ações">
                    <div className="brand login-brand">
                        <span className="brand-mark" aria-hidden="true">CA</span>
                        <span className="brand-name">Corretora <strong>Ações</strong></span>
                    </div>
                    <p className="eyebrow">Carteira de investimentos</p>
                    <h1>Decisões melhores começam com uma visão clara.</h1>
                    <div className="login-market-note">
                        <span>Ações</span>
                        <span>Corretoras</span>
                        <span>Carteira</span>
                    </div>
                </section>

                <section className="login-panel">
                    <div className="login-panel-heading">
                        <p className="eyebrow">Acesso à plataforma</p>
                        <h2>Boas-vindas de volta</h2>
                    </div>

                    <form onSubmit={handleSubmit} className="modal-form">
                        <div className="field-group">
                            <label>Email</label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="form-input"
                                autoComplete="username"
                            />
                        </div>

                        <div className="field-group">
                            <label>Senha</label>
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleInputChange}
                                className="form-input"
                                autoComplete="current-password"
                            />
                        </div>

                        <button type="submit" className="btn btn-primary login-button">
                            Entrar
                        </button>
                    </form>

                    <div className="login-switch">
                        <span>Solicite seu acesso ao administrador.</span>
                    </div>

                    {mensagem && (
                        <p className="alert alert-error">
                            {mensagem}
                        </p>
                    )}
                </section>
            </div>
        </div>
    );
};

export default Login;
