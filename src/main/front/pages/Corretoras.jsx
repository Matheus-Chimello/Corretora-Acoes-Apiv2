import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch } from '../services/api';
import { hasRole } from '../services/auth';

const Corretoras = () => {
    // Estados para a tabela de corretoras
    const [corretoras, setCorretoras] = useState([]);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

    // 1. NOVOS ESTADOS: Para o formulário de adicionar CNPJ
    const [cnpjInput, setCnpjInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [mensagem, setMensagem] = useState({ texto: '', tipo: '' }); // tipo: 'success' ou 'error'
    const canWrite = hasRole('ADMIN');

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

    return (
        <div className="container">
            <Navbar title="Corretoras" />

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
                            disabled={isLoading || !canWrite}
                            className="form-input"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !cnpjInput || !canWrite}
                        className="btn btn-primary"
                    >
                        {isLoading ? 'Buscando...' : 'Adicionar'}
                    </button>
                </form>

                {!canWrite && (
                    <div className="alert alert-warning">Usuário com permissão somente leitura.</div>
                )}

                {mensagem.texto && (
                    <div className={`alert ${getAlertClass(mensagem.tipo)}`}>
                        {mensagem.texto}
                    </div>
                )}
            </section>
            <div className="table-container">

                {corretoras.length > 0 ? (
                    <table id="minhaTabela">
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
                        {corretoras.map((corretora, index) => (
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
                        </tbody>
                    </table>
                ) : (
                    <div className="empty-state">
                        <p>Nenhuma corretora cadastrada no momento.</p>
                        <p>Utilize a barra acima para cadastrar via CNPJ.</p>
                    </div>
                )}
            </div>
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
