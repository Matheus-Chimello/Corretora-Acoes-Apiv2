import React, { useEffect, useState } from 'react';
import { apiFetch, getErrorMessage } from '../services/api';
import { correspondeAoFiltro, opcoesUnicas } from '../services/filtros';

export default function ListaCorretoras({ administrativa = false, versaoLista, atualizarLista }) {
    const [corretoras, setCorretoras] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState('');
    const [corretoraEmValidacao, setCorretoraEmValidacao] = useState(null);
    const [mensagemValidacao, setMensagemValidacao] = useState(null);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filtrosTabela, setFiltrosTabela] = useState({
        cnpj: '',
        razaoSocial: '',
        telefone: '',
        cidadeUf: '',
        validacao: ''
    });

    useEffect(() => {
        const controller = new AbortController();
        const carregar = async () => {
            setCarregando(true);
            setErro('');
            try {
                const rota = administrativa ? '/corretoras' : '/api/dashboard/corretoras';
                const response = await apiFetch(rota, { signal: controller.signal });
                if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível carregar as corretoras.'));
                const data = await response.json();
                if (controller.signal.aborted) return;
                const lista = Array.isArray(data) ? data : data?.corretoras ?? [];
                setCorretoras(administrativa ? lista : lista.filter(corretora => corretora.validadaNaCvm === true));
            } catch (error) {
                if (!controller.signal.aborted) setErro(error.message);
            } finally {
                if (!controller.signal.aborted) setCarregando(false);
            }
        };
        carregar();
        return () => controller.abort();
    }, [administrativa, versaoLista]);

    const revalidar = async (id) => {
        if (corretoraEmValidacao !== null) return;
        setCorretoraEmValidacao(id);
        setMensagemValidacao(null);
        try {
            const response = await apiFetch(`/corretoras/${id}/revalidar`, { method: 'POST' });
            if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível revalidar a corretora.'));
            const atualizada = await response.json();
            setCorretoras(atuais => atuais.map(corretora => corretora.id === id ? atualizada : corretora));
            setMensagemValidacao({
                tipo: 'success',
                texto: atualizada.validadaNaCvm
                    ? 'Corretora validada na nova consulta.'
                    : 'A nova consulta classificou a corretora como não validada.'
            });
            atualizarLista();
        } catch (error) {
            setMensagemValidacao({ tipo: 'error', texto: error.message });
        } finally {
            setCorretoraEmValidacao(null);
        }
    };

    const ordenar = (coluna) => {
        setSortConfig(atual => ({
            key: coluna,
            direction: atual.key === coluna && atual.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const atualizarFiltroTabela = (campo, valor) => {
        setFiltrosTabela((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
    };

    if (carregando && corretoras.length === 0) return <p role="status">Carregando corretoras...</p>;
    if (erro && corretoras.length === 0) return <p role="alert" className="alert alert-error">{erro}</p>;

    const corretorasFiltradas = corretoras.filter((corretora) => (
        correspondeAoFiltro(filtrosTabela.cnpj, [corretora.cnpj])
        && correspondeAoFiltro(filtrosTabela.razaoSocial, [corretora.razaoSocial, corretora.nomeFantasia])
        && correspondeAoFiltro(filtrosTabela.telefone, [corretora.telefone])
        && correspondeAoFiltro(filtrosTabela.cidadeUf, [corretora.cidade, corretora.uf, `${corretora.cidade || ''}/${corretora.uf || ''}`])
        && (!filtrosTabela.validacao || String(corretora.validadaNaCvm === true) === filtrosTabela.validacao)
    ));
    const { key, direction } = sortConfig;
    if (key) {
        const ordem = direction === 'asc' ? 1 : -1;
        corretorasFiltradas.sort((a, b) => {
            if (a[key] < b[key]) return -ordem;
            if (a[key] > b[key]) return ordem;
            return 0;
        });
    }
    const opcoesCnpj = opcoesUnicas(corretoras.map((corretora) => corretora.cnpj));
    const opcoesRazaoSocial = opcoesUnicas(corretoras.map((corretora) => corretora.razaoSocial));
    const opcoesTelefone = opcoesUnicas(corretoras.map((corretora) => corretora.telefone));
    const opcoesCidadeUf = opcoesUnicas(corretoras
        .filter((corretora) => corretora.cidade || corretora.uf)
        .map((corretora) => `${corretora.cidade || ''}/${corretora.uf || ''}`));

    return (
        <section className="table-container" aria-labelledby="corretoras-cadastradas" aria-busy={carregando}>
            <div className="table-heading">
                <div>
                    <p className="eyebrow">Instituições</p>
                    <h3 id="corretoras-cadastradas">Corretoras cadastradas</h3>
                </div>
                <span className="table-count">{corretorasFiltradas.length} de {corretoras.length}</span>
            </div>

            {erro && (
                <p role="alert" className="alert alert-error">Não foi possível atualizar a lista de corretoras.</p>
            )}
            {mensagemValidacao && (
                <p role={mensagemValidacao.tipo === 'error' ? 'alert' : 'status'} className={`alert alert-${mensagemValidacao.tipo}`}>
                    {mensagemValidacao.texto}
                </p>
            )}

            {corretoras.length > 0 ? (
                <>
                    <div className="table-filter-bar" role="group" aria-label="Filtros de corretoras">
                        <select value={filtrosTabela.cnpj} onChange={(event) => atualizarFiltroTabela('cnpj', event.target.value)} aria-label="Filtrar CNPJ" className="column-filter">
                            <option value="">Todos os CNPJs</option>
                            {opcoesCnpj.map((cnpj) => <option key={cnpj} value={cnpj}>{cnpj}</option>)}
                        </select>
                        <select value={filtrosTabela.razaoSocial} onChange={(event) => atualizarFiltroTabela('razaoSocial', event.target.value)} aria-label="Filtrar razão social" className="column-filter">
                            <option value="">Todas as corretoras</option>
                            {opcoesRazaoSocial.map((razaoSocial) => <option key={razaoSocial} value={razaoSocial}>{razaoSocial}</option>)}
                        </select>
                        <select value={filtrosTabela.telefone} onChange={(event) => atualizarFiltroTabela('telefone', event.target.value)} aria-label="Filtrar telefone" className="column-filter">
                            <option value="">Todos os telefones</option>
                            {opcoesTelefone.map((telefone) => <option key={telefone} value={telefone}>{telefone}</option>)}
                        </select>
                        <select value={filtrosTabela.cidadeUf} onChange={(event) => atualizarFiltroTabela('cidadeUf', event.target.value)} aria-label="Filtrar cidade ou UF" className="column-filter">
                            <option value="">Todas as cidades/UF</option>
                            {opcoesCidadeUf.map((cidadeUf) => <option key={cidadeUf} value={cidadeUf}>{cidadeUf}</option>)}
                        </select>
                        {administrativa && (
                            <select value={filtrosTabela.validacao} onChange={(event) => atualizarFiltroTabela('validacao', event.target.value)} aria-label="Filtrar validação CVM" className="column-filter">
                                <option value="">Todas as validações</option>
                                <option value="true">Validadas</option>
                                <option value="false">Não validadas</option>
                            </select>
                        )}
                    </div>
                    <table className="brokers-table">
                        <thead>
                            <tr>
                                <th onClick={() => ordenar('cnpj')} className="topCollumn">CNPJ</th>
                                <th onClick={() => ordenar('razaoSocial')} className="topCollumn">Razão Social</th>
                                <th>Telefone</th>
                                <th>Cidade/UF</th>
                                <th onClick={() => ordenar('validadaNaCvm')} className="topCollumn">Validação CVM</th>
                                {administrativa && <th>Última verificação</th>}
                                {administrativa && <th>Ações</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {corretorasFiltradas.map((corretora) => (
                                <tr key={corretora.cnpj}>
                                    <td>{corretora.cnpj}</td>
                                    <td>{corretora.razaoSocial}</td>
                                    <td>{corretora.telefone || '---'}</td>
                                    <td>{`${corretora.cidade || '---'}/${corretora.uf || '---'}`}</td>
                                    <td>
                                        {corretora.validadaNaCvm === true ? (
                                            <span className="badge success">Validada</span>
                                        ) : (
                                            <span className="badge danger">Não validada</span>
                                        )}
                                    </td>
                                    {administrativa && (
                                        <>
                                            <td className="broker-validation">
                                                {corretora.ultimaValidacaoEm ? (
                                                    <>
                                                        <time dateTime={corretora.ultimaValidacaoEm}>
                                                            {new Date(corretora.ultimaValidacaoEm).toLocaleString('pt-BR')}
                                                        </time>
                                                        <small>{corretora.fonteValidacao}</small>
                                                    </>
                                                ) : 'Sem verificação registrada'}
                                            </td>
                                            <td>
                                                <button type="button" className="btn btn-secondary btn-small"
                                                    aria-label={`Revalidar ${corretora.razaoSocial || corretora.cnpj}`}
                                                    disabled={corretoraEmValidacao !== null}
                                                    onClick={() => revalidar(corretora.id)}>
                                                    {corretoraEmValidacao === corretora.id ? 'Consultando...' : 'Revalidar'}
                                                </button>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                            {corretorasFiltradas.length === 0 && (
                                <tr><td colSpan={administrativa ? 7 : 5} className="table-empty">Nenhuma corretora encontrada.</td></tr>
                            )}
                        </tbody>
                    </table>
                </>
            ) : (
                <div className="empty-state">
                    <p>{administrativa ? 'Nenhuma corretora cadastrada no momento.' : 'Nenhuma corretora validada no momento.'}</p>
                </div>
            )}
        </section>
    );
}
