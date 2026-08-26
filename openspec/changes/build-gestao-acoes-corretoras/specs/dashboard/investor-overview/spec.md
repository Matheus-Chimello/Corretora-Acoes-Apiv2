## Purpose

Define dados consolidados para o painel inicial do investidor, incluindo indicadores, posicoes e agregacoes para graficos.

## ADDED Requirements

### Requirement: Dashboard stats
O sistema SHALL fornecer estatisticas consolidadas para a visao inicial do usuario autenticado.

#### Scenario: Fetch dashboard stats
- **WHEN** o usuario autenticado abrir o painel
- **THEN** o sistema SHALL retornar total de corretoras, total de posicoes, total de carteiras, saldo em acoes e saldo em conta

### Requirement: Dashboard broker summary
O sistema SHALL fornecer lista de corretoras para exibicao resumida no painel.

#### Scenario: Fetch dashboard brokers
- **WHEN** o usuario autenticado solicitar corretoras do painel
- **THEN** o sistema SHALL retornar as corretoras cadastradas disponiveis para visualizacao

### Requirement: Dashboard asset and wallet summary
O sistema SHALL fornecer as posicoes do usuario junto com suas carteiras para a area de acoes do painel.

#### Scenario: Fetch dashboard assets
- **WHEN** o usuario autenticado solicitar dados de acoes do painel
- **THEN** o sistema SHALL retornar posicoes do usuario e carteiras vinculadas ao usuario

### Requirement: Dashboard wallet summary
O sistema SHALL fornecer carteiras do usuario para visualizacao resumida.

#### Scenario: Fetch dashboard wallets
- **WHEN** o usuario autenticado solicitar carteiras do painel
- **THEN** o sistema SHALL retornar somente carteiras do usuario autenticado

### Requirement: Protected dashboard data
Todos os dados do painel SHALL exigir sessao autenticada.

#### Scenario: Unauthenticated dashboard request
- **WHEN** uma requisicao de painel nao possuir token valido
- **THEN** o sistema SHALL rejeitar a requisicao como nao autorizada
