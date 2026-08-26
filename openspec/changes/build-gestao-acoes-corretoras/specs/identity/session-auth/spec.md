## Purpose

Define cadastro, login, logout, perfis de usuario e autenticacao por token de sessao para proteger os fluxos da plataforma.

## ADDED Requirements

### Requirement: User registration
O sistema SHALL permitir cadastro de usuario com nome, email, senha e confirmacao de senha.

#### Scenario: Successful registration
- **WHEN** o usuario informar nome, email valido, senha valida e confirmacao igual
- **THEN** o sistema SHALL criar uma conta com perfil de investidor e retornar os dados publicos do usuario sem autenticar automaticamente

#### Scenario: Password confirmation mismatch
- **WHEN** a senha e a confirmacao forem diferentes
- **THEN** o sistema SHALL rejeitar o cadastro com erro de validacao

#### Scenario: Duplicate email
- **WHEN** o email informado ja pertencer a outra conta
- **THEN** o sistema SHALL rejeitar o cadastro com erro de conflito

### Requirement: Password policy
O sistema SHALL exigir senha nao vazia com tamanho minimo de seis caracteres.

#### Scenario: Short password
- **WHEN** o usuario tentar registrar senha com menos de seis caracteres
- **THEN** o sistema SHALL rejeitar o cadastro com mensagem de senha invalida

### Requirement: Session login
O sistema SHALL autenticar usuarios por email e senha e emitir um token de sessao para chamadas protegidas.

#### Scenario: Successful login
- **WHEN** o usuario informar email e senha validos
- **THEN** o sistema SHALL retornar token de sessao, nome, email e perfil

#### Scenario: Invalid credentials
- **WHEN** o usuario informar email inexistente ou senha incorreta
- **THEN** o sistema SHALL retornar erro de nao autorizado

### Requirement: Bearer token access
Rotas protegidas SHALL exigir header de autorizacao no formato Bearer com token de sessao valido.

#### Scenario: Missing authorization
- **WHEN** uma chamada protegida nao enviar token Bearer
- **THEN** o sistema SHALL rejeitar a chamada como nao autorizada

#### Scenario: Invalid session token
- **WHEN** uma chamada protegida enviar token inexistente ou expirado
- **THEN** o sistema SHALL rejeitar a chamada como nao autorizada

### Requirement: Session logout
O sistema SHALL permitir encerrar a sessao ativa do usuario autenticado.

#### Scenario: Successful logout
- **WHEN** o usuario autenticado solicitar logout
- **THEN** o sistema SHALL invalidar o token de sessao atual e retornar sucesso sem corpo

### Requirement: User roles
O sistema SHALL representar perfis de administrador e investidor nas contas de usuario.

#### Scenario: Default investor role
- **WHEN** uma nova conta for criada por cadastro publico
- **THEN** o sistema SHALL atribuir perfil de investidor

#### Scenario: Administrative seed account
- **WHEN** o ambiente inicializar dados padrao
- **THEN** o sistema SHALL poder garantir uma conta administrativa inicial
