## Purpose

Define a estrutura de navegacao da interface web, protecao de rotas, sessao local e comunicacao com a API.

## ADDED Requirements

### Requirement: Client-side routing
A interface web SHALL oferecer rotas para login, painel, corretoras, acoes e carteira.

#### Scenario: Navigate to dashboard
- **WHEN** um usuario autenticado acessar a rota principal
- **THEN** a interface SHALL exibir o painel inicial

#### Scenario: Unknown route
- **WHEN** o usuario acessar uma rota desconhecida
- **THEN** a interface SHALL redirecionar para a rota principal apropriada

### Requirement: Protected client routes
A interface web SHALL impedir acesso a rotas internas quando nao houver sessao local valida.

#### Scenario: Unauthenticated internal route access
- **WHEN** um visitante sem sessao tentar acessar painel, corretoras, acoes ou carteira
- **THEN** a interface SHALL redireciona-lo para login

#### Scenario: Authenticated login route access
- **WHEN** um usuario autenticado acessar a rota de login
- **THEN** a interface SHALL redireciona-lo para o painel

### Requirement: Local session storage
A interface web SHALL armazenar localmente os dados minimos de sessao necessarios para enviar requisicoes autenticadas.

#### Scenario: Successful login stores session
- **WHEN** o login retornar token e dados de usuario
- **THEN** a interface SHALL salvar a sessao local para uso em chamadas posteriores

#### Scenario: Invalid local session
- **WHEN** os dados locais de sessao estiverem ausentes, corrompidos ou sem token
- **THEN** a interface SHALL tratar o usuario como nao autenticado

### Requirement: API request helper
A interface web SHALL usar um helper de requisicao que monte URLs da API e inclua token Bearer quando disponivel.

#### Scenario: Authenticated API call
- **WHEN** uma chamada de API for feita com sessao local valida
- **THEN** a interface SHALL enviar o token no header Authorization

#### Scenario: Unauthorized API response
- **WHEN** a API responder com status nao autorizado
- **THEN** a interface SHALL remover a sessao local invalida

### Requirement: Configurable API base URL
A interface web SHALL permitir configurar a URL base da API e usar a origem atual como padrao.

#### Scenario: API base URL configured
- **WHEN** uma URL base de API for informada na configuracao do frontend
- **THEN** a interface SHALL usa-la para montar requisicoes HTTP
