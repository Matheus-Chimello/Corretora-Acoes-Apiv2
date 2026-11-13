import React, { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import Navbar from '../components/Navbar';
import { apiFetch, getErrorMessage } from '../services/api';

const camposVazios = { senhaAtual: '', novaSenha: '', confirmacao: '' };
const temas = [
    { valor: 'light', rotulo: 'Claro', icone: Sun },
    { valor: 'dark', rotulo: 'Escuro', icone: Moon }
];

export default function MinhaConta({ tema, aoAlterarTema }) {
    const [senhas, setSenhas] = useState(camposVazios);
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState(null);

    const alterarCampo = (event) => {
        const { name, value } = event.target;
        setSenhas(atuais => ({ ...atuais, [name]: value }));
    };

    const alterarSenha = async (event) => {
        event.preventDefault();
        if (salvando) return;
        if (senhas.novaSenha !== senhas.confirmacao) {
            setMensagem({ tipo: 'error', texto: 'As novas senhas não conferem.' });
            return;
        }

        setSalvando(true);
        setMensagem(null);
        try {
            const response = await apiFetch('/auth/me/senha', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ senhaAtual: senhas.senhaAtual, novaSenha: senhas.novaSenha })
            });
            if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível alterar a senha.'));
            setSenhas(camposVazios);
            setMensagem({ tipo: 'success', texto: 'Senha alterada com sucesso.' });
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="container">
            <Navbar title="Minha conta" />
            <main className="page-content">
                <section className="form-panel account-panel" aria-labelledby="aparencia-titulo">
                    <h2 id="aparencia-titulo">Aparência</h2>
                    <fieldset className="theme-picker">
                        <legend>Tema do site</legend>
                        <div className="theme-options">
                            {temas.map(({ valor, rotulo, icone: Icon }) => (
                                <label key={valor} className="theme-option">
                                    <Icon size={17} aria-hidden="true" />
                                    {rotulo}
                                    <input type="radio" name="tema" value={valor} checked={tema === valor}
                                        onChange={() => aoAlterarTema(valor)} />
                                </label>
                            ))}
                        </div>
                    </fieldset>
                </section>
                <section className="form-panel account-panel" aria-labelledby="alterar-senha-titulo">
                    <h2 id="alterar-senha-titulo">Alterar senha</h2>
                    <form className="app-form account-form" onSubmit={alterarSenha}>
                        <div className="field-group">
                            <label htmlFor="minha-senha-atual">Senha atual</label>
                            <input id="minha-senha-atual" name="senhaAtual" type="password" className="form-input"
                                autoComplete="current-password" value={senhas.senhaAtual} onChange={alterarCampo}
                                maxLength={72} required disabled={salvando} />
                        </div>
                        <div className="field-group">
                            <label htmlFor="minha-nova-senha">Nova senha</label>
                            <input id="minha-nova-senha" name="novaSenha" type="password" className="form-input"
                                autoComplete="new-password" value={senhas.novaSenha} onChange={alterarCampo}
                                minLength={8} maxLength={72} required disabled={salvando} />
                        </div>
                        <div className="field-group">
                            <label htmlFor="confirmar-nova-senha">Confirmar nova senha</label>
                            <input id="confirmar-nova-senha" name="confirmacao" type="password" className="form-input"
                                autoComplete="new-password" value={senhas.confirmacao} onChange={alterarCampo}
                                minLength={8} maxLength={72} required disabled={salvando} />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn btn-primary" disabled={salvando}>
                                {salvando ? 'Salvando...' : 'Alterar senha'}
                            </button>
                        </div>
                    </form>
                    {mensagem && <p role={mensagem.tipo === 'error' ? 'alert' : 'status'}
                        className={`alert alert-${mensagem.tipo}`}>{mensagem.texto}</p>}
                </section>
            </main>
        </div>
    );
}
