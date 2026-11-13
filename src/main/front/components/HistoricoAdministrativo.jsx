import React, { useEffect, useState } from 'react';
import { apiFetch, getErrorMessage } from '../services/api';

const nomesDasAcoes = {
    ALTERACAO_PERFIL: 'Alteração de perfil',
    INATIVACAO_CONTA: 'Inativação de conta',
    REVALIDACAO_CORRETORA: 'Revalidação de corretora'
};

export default function HistoricoAdministrativo() {
    const [pagina, setPagina] = useState(0);
    const [revisao, setRevisao] = useState(0);
    const [historico, setHistorico] = useState({ eventos: [], temProxima: false });
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');

    useEffect(() => {
        const controller = new AbortController();
        const carregar = async () => {
            setCarregando(true);
            setErro('');
            try {
                const response = await apiFetch(`/api/admin/historico?pagina=${pagina}`, { signal: controller.signal });
                if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível carregar o histórico.'));
                const dados = await response.json();
                if (!controller.signal.aborted) setHistorico(dados);
            } catch (error) {
                if (!controller.signal.aborted) setErro(error.message);
            } finally {
                if (!controller.signal.aborted) setCarregando(false);
            }
        };
        carregar();
        return () => controller.abort();
    }, [pagina, revisao]);

    return (
        <section id="historico-administrativo" className="table-container admin-history" aria-labelledby="historico-administrativo-titulo">
            <div className="table-heading">
                <h3 id="historico-administrativo-titulo">Histórico administrativo</h3>
                <button type="button" className="btn btn-secondary btn-small" disabled={carregando}
                    onClick={() => setRevisao(atual => atual + 1)}>Recarregar histórico</button>
            </div>
            {carregando && <p className="chart-empty" role="status">Carregando histórico...</p>}
            {erro && <p className="alert alert-error" role="alert">{erro}</p>}
            {!carregando && !erro && (
                historico.eventos.length === 0 ? <p className="chart-empty">Nenhum registro nesta página.</p> : (
                    <table>
                        <thead>
                            <tr>
                                <th scope="col">Data e hora</th>
                                <th scope="col">Autor</th>
                                <th scope="col">Ação</th>
                                <th scope="col">Alvo</th>
                                <th scope="col">Resultado</th>
                            </tr>
                        </thead>
                        <tbody>
                            {historico.eventos.map(evento => (
                                <tr key={evento.id}>
                                    <td><time dateTime={evento.dataHora}>{new Date(evento.dataHora).toLocaleString('pt-BR')}</time></td>
                                    <td>{evento.autor}</td>
                                    <td>{nomesDasAcoes[evento.acao] || evento.acao}</td>
                                    <td>{evento.alvo}</td>
                                    <td>{evento.resultado}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )
            )}
            {(pagina > 0 || historico.temProxima) && (
                <div className="admin-actions admin-history-pagination">
                    <button type="button" className="btn btn-secondary btn-small" disabled={carregando || pagina === 0}
                        onClick={() => setPagina(atual => atual - 1)}>Página anterior</button>
                    <span>Página {pagina + 1}</span>
                    <button type="button" className="btn btn-secondary btn-small" disabled={carregando || Boolean(erro) || !historico.temProxima}
                        onClick={() => setPagina(atual => atual + 1)}>Próxima página</button>
                </div>
            )}
        </section>
    );
}
