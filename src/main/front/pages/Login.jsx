import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, registerUser } from '../services/auth';

const Login = () => {
    const navigate = useNavigate();
    const [isRegistering, setIsRegistering] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
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
            if (isRegistering) {
                await registerUser(formData);
                setIsRegistering(false);
                setFormData({
                    name: '',
                    email: formData.email,
                    password: '',
                    confirmPassword: ''
                });
                setMensagem('Conta criada com sucesso. Entre para continuar.');
                return;
            } else {
                await login(formData.email, formData.password);
            }
            navigate('/', { replace: true });
        } catch (error) {
            setMensagem(error.message);
        }
    };

    const handleToggleMode = () => {
        setMensagem('');
        setIsRegistering((currentValue) => !currentValue);
        setFormData({
            name: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    return (
        <div className="login-page">
            <section className="login-panel">
                <div className="login-brand">
                    <span className="ticker-badge">API</span>
                    <h1>Gestão Financeira</h1>
                </div>

                <form onSubmit={handleSubmit} className="modal-form">
                    {isRegistering && (
                        <div className="field-group">
                            <label>Nome</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className="form-input"
                                autoComplete="name"
                            />
                        </div>
                    )}

                    <div className="field-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            className="form-input"
                            autoComplete={isRegistering ? 'email' : 'username'}
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
                            autoComplete={isRegistering ? 'new-password' : 'current-password'}
                        />
                    </div>

                    {isRegistering && (
                        <div className="field-group">
                            <label>Confirmar senha</label>
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                className="form-input"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary login-button">
                        {isRegistering ? 'Criar conta' : 'Entrar'}
                    </button>
                </form>

                <div className="login-switch">
                    <span>{isRegistering ? 'Já possui conta?' : 'Ainda não tem conta?'}</span>
                    <button type="button" className="login-link-button" onClick={handleToggleMode}>
                        {isRegistering ? 'Entrar' : 'Cadastre-se'}
                    </button>
                </div>

                {mensagem && (
                    <p className="alert alert-error">
                        {mensagem}
                    </p>
                )}
            </section>
        </div>
    );
};

export default Login;
