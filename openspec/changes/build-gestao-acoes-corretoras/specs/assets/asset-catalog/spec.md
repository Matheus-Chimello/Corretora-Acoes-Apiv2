## Purpose

Define o catalogo global de acoes disponiveis para consulta, cotacao e negociacao nas carteiras dos usuarios.

## ADDED Requirements

### Requirement: Asset creation
O sistema SHALL permitir cadastrar uma acao informando ticker, mercado e corretora relacionada.

#### Scenario: Successful asset creation
- **WHEN** ticker, mercado e corretora validada forem informados
- **THEN** o sistema SHALL consultar a cotacao externa e persistir o ativo com nome, moeda, preco atual e horario da cotacao

#### Scenario: Missing asset fields
- **WHEN** ticker, mercado ou corretora nao forem informados
- **THEN** o sistema SHALL rejeitar o cadastro com erro de validacao

### Requirement: Unique ticker
O sistema SHALL manter um catalogo global em que cada ticker normalizado exista no maximo uma vez.

#### Scenario: Duplicate ticker
- **WHEN** uma nova acao tiver ticker ja cadastrado
- **THEN** o sistema SHALL rejeitar o cadastro com erro de negocio

### Requirement: Broker eligibility
O sistema SHALL permitir cadastrar acoes somente vinculadas a corretoras validadas para mercado financeiro.

#### Scenario: Unvalidated broker
- **WHEN** a corretora relacionada nao estiver validada para mercado financeiro
- **THEN** o sistema SHALL rejeitar o cadastro da acao

#### Scenario: Missing broker
- **WHEN** o identificador de corretora nao corresponder a uma corretora existente
- **THEN** o sistema SHALL rejeitar o cadastro da acao

### Requirement: Quote refresh
O sistema SHALL permitir atualizar a cotacao de uma acao cadastrada.

#### Scenario: Successful quote refresh
- **WHEN** um usuario autenticado solicitar atualizacao de cotacao de uma acao existente
- **THEN** o sistema SHALL consultar o provedor adequado ao mercado e atualizar preco, moeda, nome quando disponivel e horario

#### Scenario: Asset not found for quote refresh
- **WHEN** o identificador informado nao corresponder a uma acao cadastrada
- **THEN** o sistema SHALL retornar erro de recurso inexistente

### Requirement: Asset queries
O sistema SHALL permitir listar acoes cadastradas e buscar acao por identificador ou ticker.

#### Scenario: List catalog assets
- **WHEN** um usuario autenticado solicitar o catalogo de acoes
- **THEN** o sistema SHALL retornar todos os ativos cadastrados com resumo da corretora relacionada

#### Scenario: Find asset by ticker
- **WHEN** um usuario autenticado buscar acao por ticker
- **THEN** o sistema SHALL retornar o ativo correspondente ou indicar que nao foi encontrado
