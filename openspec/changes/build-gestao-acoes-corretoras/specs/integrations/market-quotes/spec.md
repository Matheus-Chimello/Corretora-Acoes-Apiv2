## Purpose

Define consulta de cotacoes de ativos para mercados brasileiro e norte-americano, incluindo erros e dados retornados.

## ADDED Requirements

### Requirement: Brazilian market quote
O sistema SHALL consultar cotacao de ativos do mercado brasileiro usando o provedor configurado para mercado BR.

#### Scenario: Successful BR quote
- **WHEN** uma cotacao BR for solicitada para ticker existente
- **THEN** o sistema SHALL retornar ticker, nome da empresa, moeda e preco atual

#### Scenario: BR ticker not found
- **WHEN** o provedor BR nao retornar resultado para o ticker
- **THEN** o sistema SHALL rejeitar a operacao com mensagem de ticker nao encontrado

### Requirement: United States market quote
O sistema SHALL consultar cotacao de ativos do mercado norte-americano usando o provedor configurado para mercado US.

#### Scenario: Successful US quote
- **WHEN** uma cotacao US for solicitada para ticker existente e chave configurada
- **THEN** o sistema SHALL retornar ticker, moeda USD e preco atual

#### Scenario: Missing US quote credential
- **WHEN** uma cotacao US for solicitada sem chave obrigatoria configurada
- **THEN** o sistema SHALL rejeitar a operacao com erro de configuracao de credencial

#### Scenario: US ticker not found
- **WHEN** o provedor US nao retornar preco para o ticker
- **THEN** o sistema SHALL rejeitar a operacao com mensagem de ticker nao encontrado

### Requirement: Supported markets
O sistema SHALL aceitar somente mercados BR e US para consulta de cotacao.

#### Scenario: Unsupported market
- **WHEN** uma cotacao for solicitada para mercado diferente de BR ou US
- **THEN** o sistema SHALL rejeitar a operacao com erro de mercado invalido

### Requirement: Quote failure handling
O sistema SHALL converter falhas de provedores de cotacao em erros compreensiveis para consumidores da API.

#### Scenario: External quote provider failure
- **WHEN** o provedor de cotacao falhar, limitar requisicoes ou negar credencial
- **THEN** o sistema SHALL retornar erro padronizado indicando falha externa ou credencial invalida conforme o caso
