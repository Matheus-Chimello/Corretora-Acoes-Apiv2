import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { correspondeAoFiltro, opcoesUnicas } from '../services/filtros';

const Corretoras = () => {
    // Estados para a tabela de corretoras
    const [corretoras, setCorretoras] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [filtrosTabela, setFiltrosTabela] = useState({
        cnpj: '',
        razaoSocial: '',
        telefone: '',
        cidadeUf: '',
        validacao: ''
    });

    // 1. NOVOS ESTADOS: Para o formulário de adicionar CNPJ
    const [cnpjInput, setCnpjInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' }); // tipo: 'success' ou 'error'

    // Função de carregamento inicial
    useEffect(() => {
        apiFetch('/api/dashboard/corretoras')
            .then(response => {
                if (!response.ok) throw new Error("Erro ao carregar dados do servidor");
                return response.json();
            })
            .then(data => {
                if (Array.isArray(data)) {
                    setCorretoras(data);
                } else {
                    setCorretoras(data.corretoras || []);
                }
            })
            .catch(error => console.error("Erro na requisição GET:", error));
    }, []);

    // 2. NOVA FUNÇÃO: Cadastrar corretora via POST
    const handleAdicionarCorretora = (e) => {
        e.preventDefault(); // Evita que a página recarregue ao enviar o formulário
        if (!cnpjInput.trim()) return;

        setIsLoading(true);
        setMensagem({ texto: '', tipo: '' }); // Reseta a mensagem

        // O seu controller Spring mapeia o POST para /corretoras
        apiFetch('/corretoras', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cnpj: cnpjInput }) // Envia o Map<String, String> esperado pelo Java
        })
            .then(async response => {
                if (!response.ok) {
                    // Tenta capturar a mensagem de erro que o Java (IllegalArgumentException) devolve
                    const errorText = await response.text();
                    throw new Error(errorText || "Erro ao adicionar corretora.");
                }
                return response.json();
            })
            .then(novaCorretora => {
                // Adiciona a nova corretora à lista existente sem precisar recarregar a página
                setCorretoras(prev => [...prev, novaCorretora]);
                setCnpjInput(''); // Limpa o campo
                setMensagem({
                    texto: novaCorretora.validadaNaCvm
                        ? 'Corretora adicionada com sucesso. CVM validada.'
                        : 'CNPJ cadastrado, mas não é uma corretora de valores validada na CVM.',
                    tipo: novaCorretora.validadaNaCvm ? 'success' : 'warning'
                });
            })
            .catch(error => {
                console.error("Erro no POST:", error);
                setMensagem({ texto: error.message, tipo: 'error' });
            })
            .finally(() => {
                setIsLoading(false);
                // Limpa a mensagem após 4 segundos
                setTimeout(() => setMensagem({ texto: '', tipo: '' }), 4000);
            });
    };

    // Função de ordenação
    const ordenar = (coluna) => {
        let direcao = 'asc';
        if (sortConfig.key === coluna && sortConfig.direction === 'asc') {
            direcao = 'desc';
        }

        const corretorasOrdenadas = [...corretoras].sort((a, b) => {
            if (a[coluna] < b[coluna]) return direcao === 'asc' ? -1 : 1;
            if (a[coluna] > b[coluna]) return direcao === 'asc' ? 1 : -1;
            return 0;
        });

        setCorretoras(corretorasOrdenadas);
        setSortConfig({ key: coluna, direction: direcao });
    };

    const atualizarFiltroTabela = (campo, valor) => {
        setFiltrosTabela((filtrosAtuais) => ({ ...filtrosAtuais, [campo]: valor }));
    };

    const corretorasFiltradas = corretoras.filter((corretora) => (
        correspondeAoFiltro(filtrosTabela.cnpj, [corretora.cnpj])
        && correspondeAoFiltro(filtrosTabela.razaoSocial, [corretora.razaoSocial, corretora.nomeFantasia])
        && correspondeAoFiltro(filtrosTabela.telefone, [corretora.telefone])
        && correspondeAoFiltro(filtrosTabela.cidadeUf, [corretora.cidade, corretora.uf, `${corretora.cidade || ''}/${corretora.uf || ''}`])
        && (!filtrosTabela.validacao || String(Boolean(corretora.validadaNaCvm)) === filtrosTabela.validacao)
    ));
    const opcoesCnpj = opcoesUnicas(corretoras.map((corretora) => corretora.cnpj));
    const opcoesRazaoSocial = opcoesUnicas(corretoras.map((corretora) => corretora.razaoSocial));
    const opcoesTelefone = opcoesUnicas(corretoras.map((corretora) => corretora.telefone));
    const opcoesCidadeUf = opcoesUnicas(corretoras
        .filter((corretora) => corretora.cidade || corretora.uf)
        .map((corretora) => `${corretora.cidade || ''}/${corretora.uf || ''}`));

    return (
        <div className="container">
            <Navbar title="Corretoras" />

            <main className="page-content">
            <section className="form-panel">
                <h3>Adicionar Corretora</h3>
                <form onSubmit={handleAdicionarCorretora} className="app-form search-form">
                    <div className="field-group">
                        <label htmlFor="cnpj-input">Adicionar por CNPJ:</label>
                        <input
                            id="cnpj-input"
                            type="text"
                            placeholder="Apenas números ou formatado..."
                            value={cnpjInput}
                            onChange={(e) => setCnpjInput(e.target.value)}
                            disabled={isLoading}
                            className="form-input"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !cnpjInput}
                        className="btn btn-primary"
                    >
                        {isLoading ? 'Buscando...' : 'Adicionar'}
                    </button>
                </form>

                {mensagem.texto && (
                    <div className={`alert ${getAlertClass(mensagem.tipo)}`}>
                        {mensagem.texto}
                    </div>
                )}
            </section>
            <div className="table-container">
                <div className="table-heading">
                    <div>
                        <p className="eyebrow">Instituições</p>
                        <h3>Corretoras cadastradas</h3>
                    </div>
                    <span className="table-count">{corretorasFiltradas.length} de {corretoras.length}</span>
                </div>

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
                        <select value={filtrosTabela.validacao} onChange={(event) => atualizarFiltroTabela('validacao', event.target.value)} aria-label="Filtrar validação CVM" className="column-filter">
                            <option value="">Todas as validações</option>
                            <option value="true">Validadas</option>
                            <option value="false">Não CVM</option>
                        </select>
                    </div>
                    <table id="minhaTabela" className="brokers-table">
                        <thead>
                        <tr>
                            <th onClick={() => ordenar('cnpj')} className="topCollumn">CNPJ</th>
                            <th onClick={() => ordenar('razaoSocial')} className="topCollumn">Razão Social</th>
                            <th>Telefone</th>
                            <th>Cidade/UF</th>
                            <th onClick={() => ordenar('validadaNaCvm')} className="topCollumn">Validação CVM</th>
                        </tr>
                        </thead>
                        <tbody>
                        {corretorasFiltradas.map((corretora, index) => (
                            <tr key={index}>
                                <td>{corretora.cnpj}</td>
                                <td>{corretora.razaoSocial}</td>
                                <td>{corretora.telefone || '---'}</td>
                                <td>{`${corretora.cidade || '---'}/${corretora.uf || '---'}`}</td>
                                <td>
                                    {corretora.validadaNaCvm ? (
                                        <span className="badge success">Validada</span>
                                    ) : (
                                        <span className="badge danger">Não CVM</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {corretorasFiltradas.length === 0 && (
                            <tr><td colSpan="5" className="table-empty">Nenhuma corretora encontrada.</td></tr>
                        )}
                        </tbody>
                    </table>
                    </>
                ) : (
                    <div className="empty-state">
                        <p>Nenhuma corretora cadastrada no momento.</p>
                        <p>Utilize a barra acima para cadastrar via CNPJ.</p>
                    </div>
                )}
            </div>
            </main>
        </div>
    );
};

const getAlertClass = (tipo) => {
    if (tipo === 'error') {
        return 'alert-error';
    }

    if (tipo === 'warning') {
        return 'alert-warning';
    }

    return 'alert-success';
};

export default Corretoras;
