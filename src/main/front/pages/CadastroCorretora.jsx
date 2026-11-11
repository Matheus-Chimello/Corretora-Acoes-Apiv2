import React, { useState } from 'react';
import ListaCorretoras from '../components/ListaCorretoras';
import Navbar from '../components/Navbar';
import { apiFetch, getErrorMessage } from '../services/api';

export default function CadastroCorretora() {
    const [cnpj, setCnpj] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [mensagem, setMensagem] = useState(null);
    const [versaoLista, setVersaoLista] = useState(0);
    const atualizarLista = () => setVersaoLista(versao => versao + 1);

    const cadastrar = async (event) => {
        event.preventDefault();
        const valor = cnpj.trim();
        if (!valor || salvando) return;
        setSalvando(true);
        setMensagem(null);
        try {
            const response = await apiFetch('/corretoras', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ cnpj: valor })
            });
            if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível adicionar a corretora.'));
            const corretora = await response.json();
            setCnpj('');
            setMensagem(corretora.validadaNaCvm
                ? { tipo: 'success', texto: 'Corretora adicionada com sucesso. CVM validada.' }
                : { tipo: 'warning', texto: 'CNPJ cadastrado, mas não é uma corretora de valores validada na CVM.' });
            atualizarLista();
        } catch (error) {
            setMensagem({ tipo: 'error', texto: error.message });
        } finally {
            setSalvando(false);
        }
    };

    return (
        <div className="container">
            <Navbar title="Corretoras" />
            <main className="page-content admin-page">
                <section className="form-panel">
                    <h3>Adicionar Corretora</h3>
                    <form onSubmit={cadastrar} className="app-form search-form">
                        <div className="field-group">
                            <label htmlFor="cnpj-input">Adicionar por CNPJ:</label>
                            <input id="cnpj-input" type="text" className="form-input" value={cnpj}
                                placeholder="Apenas números ou formatado..." onChange={event => setCnpj(event.target.value)} disabled={salvando} />
                        </div>
                        <button type="submit" className="btn btn-primary" disabled={salvando || !cnpj.trim()}>
                            {salvando ? 'Buscando...' : 'Adicionar'}
                        </button>
                    </form>
                    {mensagem && <div role="alert" className={`alert alert-${mensagem.tipo}`}>{mensagem.texto}</div>}
                </section>
                <ListaCorretoras administrativa versaoLista={versaoLista} atualizarLista={atualizarLista} />
            </main>
        </div>
    );
}
