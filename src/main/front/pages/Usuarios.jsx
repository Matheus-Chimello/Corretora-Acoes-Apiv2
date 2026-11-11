import React, { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { apiFetch, getErrorMessage } from '../services/api';

const formularioVazio = () => ({ nome: '', email: '', papel: 'USER', ativo: true, password: '', confirmPassword: '' });

const Usuarios = () => {
    const [usuarios, setUsuarios] = useState([]);
    const [carregando, setCarregando] = useState(true);
    const [mensagem, setMensagem] = useState({ tipo: '', texto: '' });
    const [modal, setModal] = useState(null);
    const [formulario, setFormulario] = useState(formularioVazio);
    const [erroFormulario, setErroFormulario] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [selecionado, setSelecionado] = useState(null);
    const [busca, setBusca] = useState('');
    const [perfil, setPerfil] = useState('');
    const [situacao, setSituacao] = useState('');
    const gatilhoModal = useRef(null);

    const fechar = () => {
        setModal(null);
        setFormulario(formularioVazio());
        setErroFormulario('');
        setSelecionado(null);
        gatilhoModal.current?.focus();
    };
    const alterarCampo = (event) => setFormulario(atual => ({ ...atual, [event.target.name]: event.target.value }));
    const abrirNovo = () => {
        gatilhoModal.current = document.activeElement;
        setFormulario(formularioVazio());
        setErroFormulario('');
        setModal('novo');
    };
    const abrirEdicao = (usuario) => {
        gatilhoModal.current = document.activeElement;
        setSelecionado(usuario);
        setFormulario({ ...formularioVazio(), nome: usuario.nome, email: usuario.email, papel: usuario.papel, ativo: usuario.ativo });
        setErroFormulario('');
        setModal('editar');
    };
    const abrirSenha = (usuario) => {
        gatilhoModal.current = document.activeElement;
        setSelecionado(usuario);
        setFormulario(formularioVazio());
        setErroFormulario('');
        setModal('senha');
    };

    const salvar = async (event) => {
        event.preventDefault();
        if (salvando) return;
        setErroFormulario('');
        setSalvando(true);
        try {
            const criando = modal === 'novo';
            const alterandoSenha = modal === 'senha';
            if ((criando || alterandoSenha) && formulario.password !== formulario.confirmPassword) throw new Error('As senhas não conferem.');
            const payload = alterandoSenha ? { password: formulario.password } : { nome: formulario.nome.trim(), email: formulario.email.trim(), papel: formulario.papel,
                ...(criando ? { password: formulario.password } : { ativo: formulario.ativo }) };
            const response = await apiFetch(criando ? '/api/usuarios' : `/api/usuarios/${selecionado.id}${alterandoSenha ? '/senha' : ''}`, {
                method: criando ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível salvar as alterações.'));
            if (!alterandoSenha) {
                const usuario = await response.json();
                setUsuarios(atuais => criando ? [...atuais, usuario] : atuais.map(item => item.id === usuario.id ? usuario : item));
            }
            fechar();
            setMensagem({ tipo: 'success', texto: alterandoSenha ? 'Senha alterada com sucesso.' : criando ? 'Usuário cadastrado com sucesso.' : 'Usuário atualizado com sucesso.' });
        } catch (error) {
            setErroFormulario(error.message);
        } finally {
            setSalvando(false);
        }
    };

    const carregar = async () => {
        setCarregando(true);
        setMensagem({ tipo: '', texto: '' });
        try {
            const response = await apiFetch('/api/usuarios');
            if (!response.ok) throw new Error(await getErrorMessage(response, 'Não foi possível carregar os usuários.'));
            setUsuarios(await response.json());
        } catch (error) {
            setUsuarios([]);
            setMensagem({ tipo: 'error', texto: error.message });
        } finally {
            setCarregando(false);
        }
    };

    useEffect(() => { carregar(); }, []);

    const filtrados = usuarios.filter(usuario =>
        `${usuario.nome} ${usuario.email}`.toLocaleLowerCase('pt-BR').includes(busca.trim().toLocaleLowerCase('pt-BR'))
        && (!perfil || usuario.papel === perfil)
        && (!situacao || (situacao === 'ativas' ? usuario.ativo : !usuario.ativo)));

    return <div className="container">
        <Navbar title="Administração" />
        <main className="page-content admin-page">
            <section className="admin-heading">
                <div><p className="eyebrow">Controle de acesso</p><h2>Usuários</h2>
                    <p>Gerencie as contas e os perfis de acesso à plataforma.</p></div>
                <div className="admin-actions">
                    <button className="btn btn-secondary" onClick={carregar} disabled={carregando || salvando}>Recarregar</button>
                    <button className="btn btn-primary" onClick={abrirNovo} disabled={carregando}>Novo usuário</button>
                </div>
            </section>
            {mensagem.texto && <p role="alert" className={`alert alert-${mensagem.tipo}`}>{mensagem.texto}</p>}
            <section className="admin-filters form-panel" aria-label="Filtros de usuários">
                <div className="field-group"><label htmlFor="admin-busca">Buscar por nome ou email</label>
                    <input id="admin-busca" className="form-input" type="search" value={busca} onChange={event => setBusca(event.target.value)} placeholder="Digite um nome ou email" /></div>
                <div className="field-group"><label htmlFor="admin-perfil">Filtrar perfil</label>
                    <select id="admin-perfil" className="form-input" value={perfil} onChange={event => setPerfil(event.target.value)}>
                        <option value="">Todos os perfis</option><option value="USER">Usuário</option><option value="ADMIN">Administrador</option>
                    </select></div>
                <div className="field-group"><label htmlFor="admin-situacao">Filtrar situação</label>
                    <select id="admin-situacao" className="form-input" value={situacao} onChange={event => setSituacao(event.target.value)}>
                        <option value="">Todas as situações</option><option value="ativas">Ativas</option><option value="inativas">Inativas</option>
                    </select></div>
            </section>
            {carregando ? <p role="status">Carregando usuários...</p> : <section className="table-container">
                <p className="admin-count">{filtrados.length} de {usuarios.length} contas</p>
                <table><thead><tr><th scope="col">Nome</th><th scope="col">Email</th><th scope="col">Perfil</th><th scope="col">Situação</th><th scope="col">Ações</th></tr></thead>
                    <tbody>{filtrados.map(usuario => <tr key={usuario.id}>
                        <td>{usuario.nome}</td><td>{usuario.email}</td>
                        <td><span className="role-badge">{usuario.papel === 'ADMIN' ? 'Administrador' : 'Usuário'}</span></td>
                        <td><span className={`badge ${usuario.ativo ? 'success' : 'danger'}`}>{usuario.ativo ? 'Ativa' : 'Inativa'}</span></td>
                        <td><div className="admin-row-actions">
                            <button type="button" className="btn btn-secondary btn-small" aria-label={`Editar ${usuario.nome}`} onClick={() => abrirEdicao(usuario)}>Editar</button>
                            <button type="button" className="btn btn-secondary btn-small" aria-label={`Alterar senha de ${usuario.nome}`} onClick={() => abrirSenha(usuario)}>Alterar senha</button>
                        </div></td>
                    </tr>)}</tbody></table>
                {usuarios.length === 0 && <p className="chart-empty">Nenhum usuário cadastrado.</p>}
                {usuarios.length > 0 && filtrados.length === 0 && <p className="chart-empty">Nenhum usuário encontrado para os filtros.</p>}
            </section>}
            {modal && <div className="modal-overlay" onKeyDown={event => {
                if (event.key === 'Escape' && !salvando) { event.preventDefault(); fechar(); }
                if (event.key === 'Tab') {
                    const campos = event.currentTarget.querySelectorAll('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
                    const primeiro = campos[0];
                    const ultimo = campos[campos.length - 1];
                    if (event.shiftKey && document.activeElement === primeiro) { event.preventDefault(); ultimo.focus(); }
                    if (!event.shiftKey && document.activeElement === ultimo) { event.preventDefault(); primeiro.focus(); }
                }
            }}>
                <div className="modal-panel admin-dialog" role="dialog" aria-modal="true" aria-labelledby="usuario-dialog-title">
                    <div className="modal-header">
                        <h3 id="usuario-dialog-title">{modal === 'novo' ? 'Novo usuário' : modal === 'senha' ? 'Alterar senha' : 'Editar usuário'}</h3>
                        <button type="button" className="modal-close" aria-label="Fechar formulário" disabled={salvando} onClick={fechar}>×</button>
                    </div>
                    <form className="modal-form" onSubmit={salvar}>
                        {erroFormulario && <p role="alert" className="alert alert-error">{erroFormulario}</p>}
                        {modal === 'senha' && <p>Defina uma nova senha para <strong>{selecionado.nome}</strong> ({selecionado.email}).</p>}
                        {modal !== 'senha' && <><div className="field-group"><label htmlFor="usuario-nome">Nome</label>
                            <input id="usuario-nome" className="form-input" name="nome" value={formulario.nome} onChange={alterarCampo} required maxLength={100} autoFocus /></div>
                        <div className="field-group"><label htmlFor="usuario-email">Email</label>
                            <input id="usuario-email" className="form-input" name="email" type="email" value={formulario.email} onChange={alterarCampo} required maxLength={100} autoComplete="off" /></div>
                        <div className="field-group"><label htmlFor="usuario-papel">Perfil</label>
                            <select id="usuario-papel" className="form-input" name="papel" value={formulario.papel} onChange={alterarCampo}>
                                <option value="USER">Usuário</option><option value="ADMIN">Administrador</option>
                            </select></div></>}
                        {modal === 'editar' && <>
                            <label className="admin-active"><input type="checkbox" checked={formulario.ativo} onChange={event => setFormulario(atual => ({ ...atual, ativo: event.target.checked }))} /> Conta ativa</label>
                            <p className="admin-hint">Mudanças de acesso valem para novos logins. Sessões já abertas podem continuar ativas até expirar.</p>
                        </>}
                        {modal !== 'editar' && <><div className="field-group"><label htmlFor="usuario-senha">{modal === 'novo' ? 'Senha inicial' : 'Nova senha'}</label>
                            <input id="usuario-senha" className="form-input" type="password" name="password" value={formulario.password} onChange={alterarCampo} required minLength={8} maxLength={72} autoComplete="new-password" autoFocus={modal === 'senha'} />
                            <small>Use entre 8 e 72 caracteres.</small></div>
                        <div className="field-group"><label htmlFor="usuario-confirmacao">Confirmar senha</label>
                            <input id="usuario-confirmacao" className="form-input" type="password" name="confirmPassword" value={formulario.confirmPassword} onChange={alterarCampo} required minLength={8} maxLength={72} autoComplete="new-password" /></div></>}
                        <div className="modal-actions">
                            <button type="button" className="btn btn-secondary" disabled={salvando} onClick={fechar}>Cancelar</button>
                            <button className="btn btn-primary" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : modal === 'novo' ? 'Cadastrar usuário' : modal === 'senha' ? 'Alterar senha' : 'Salvar alterações'}</button>
                        </div>
                    </form>
                </div>
            </div>}
        </main>
    </div>;
};

export default Usuarios;
