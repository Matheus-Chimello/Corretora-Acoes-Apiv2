## Purpose

Define os fluxos visiveis de usuario para autenticacao, painel, corretoras, catalogo de acoes e carteira.

## ADDED Requirements

### Requirement: Login and registration screen
A interface SHALL permitir alternar entre login e cadastro de nova conta.

#### Scenario: User logs in
- **WHEN** o usuario informar email e senha validos na tela de login
- **THEN** a interface SHALL autenticar, salvar a sessao e navegar para o painel

#### Scenario: User registers account
- **WHEN** o usuario preencher nome, email, senha e confirmacao validos
- **THEN** a interface SHALL criar a conta, retornar ao modo de login e exibir mensagem de sucesso

#### Scenario: Authentication error
- **WHEN** login ou cadastro falhar
- **THEN** a interface SHALL exibir a mensagem de erro retornada pela API ou uma mensagem padrao

### Requirement: Dashboard screen
A interface SHALL exibir resumo financeiro, contadores e graficos de acompanhamento no painel inicial.

#### Scenario: Dashboard data loads
- **WHEN** o painel for aberto por usuario autenticado
- **THEN** a interface SHALL carregar estatisticas, posicoes e catalogo de acoes para compor cards, listas e graficos

#### Scenario: Dashboard has no positions
- **WHEN** o usuario nao possuir posicoes em carteira
- **THEN** a interface SHALL exibir estado vazio com acao de navegacao para a tela de acoes

### Requirement: Broker management screen
A interface SHALL permitir cadastrar corretora por CNPJ e listar corretoras cadastradas.

#### Scenario: Add broker
- **WHEN** o usuario informar CNPJ e enviar o formulario
- **THEN** a interface SHALL chamar a API de cadastro e atualizar a tabela com a corretora criada

#### Scenario: Broker table sorting
- **WHEN** o usuario selecionar colunas ordenaveis da tabela
- **THEN** a interface SHALL alternar a ordenacao crescente e decrescente dos dados exibidos

#### Scenario: Broker validation status
- **WHEN** corretoras forem exibidas na tabela
- **THEN** a interface SHALL indicar visualmente se cada corretora foi validada para mercado financeiro

### Requirement: Asset catalog and trade screen
A interface SHALL permitir cadastrar ativos no catalogo, comprar acoes e vender posicoes existentes.

#### Scenario: Register catalog asset
- **WHEN** o usuario preencher ticker, mercado e corretora validada
- **THEN** a interface SHALL solicitar cadastro do ativo e recarregar catalogo, corretoras e posicoes

#### Scenario: Buy asset
- **WHEN** o usuario selecionar uma acao do catalogo e informar quantidade valida
- **THEN** a interface SHALL solicitar compra e atualizar as posicoes exibidas

#### Scenario: Sell asset
- **WHEN** o usuario selecionar uma posicao existente e informar quantidade valida disponivel
- **THEN** a interface SHALL solicitar venda e atualizar saldo e posicoes exibidas

#### Scenario: Sell button without positions
- **WHEN** o usuario nao possuir posicoes
- **THEN** a interface SHALL manter o comando de venda indisponivel

### Requirement: Wallet screen
A interface SHALL exibir saldos da carteira, permitir aporte e listar posicoes atuais.

#### Scenario: Wallet data loads
- **WHEN** o usuario abrir a tela de carteira
- **THEN** a interface SHALL carregar carteira principal e posicoes do usuario

#### Scenario: Add contribution
- **WHEN** o usuario informar valor positivo de aporte
- **THEN** a interface SHALL solicitar o aporte, atualizar saldo em conta e exibir mensagem de sucesso

#### Scenario: Wallet has no positions
- **WHEN** o usuario nao possuir posicoes
- **THEN** a interface SHALL exibir estado vazio na tabela de composicao
