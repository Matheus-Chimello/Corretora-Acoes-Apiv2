## Purpose

Define o cadastro e a consulta de corretoras por CNPJ, com enriquecimento cadastral e indicador de validacao de mercado.

## ADDED Requirements

### Requirement: Broker creation by document
O sistema SHALL permitir cadastrar corretora informando somente o CNPJ.

#### Scenario: Successful broker creation
- **WHEN** um CNPJ valido, nao duplicado e consultavel for informado
- **THEN** o sistema SHALL persistir a corretora com dados cadastrais e endereco obtidos de fontes publicas

#### Scenario: Formatted document input
- **WHEN** o CNPJ for informado com pontuacao
- **THEN** o sistema SHALL normalizar o valor para apenas digitos antes das validacoes

### Requirement: CNPJ validation
O sistema SHALL validar formato, tamanho e digitos verificadores do CNPJ antes de consultar fontes externas.

#### Scenario: Invalid CNPJ
- **WHEN** o CNPJ nao possuir 14 digitos validos ou tiver digitos verificadores invalidos
- **THEN** o sistema SHALL rejeitar o cadastro sem consultar fonte externa

#### Scenario: Repeated CNPJ
- **WHEN** ja existir corretora com o mesmo CNPJ normalizado
- **THEN** o sistema SHALL rejeitar o cadastro com erro de negocio

### Requirement: Public company data enrichment
O sistema SHALL preencher os dados empresariais da corretora a partir de fonte publica de CNPJ.

#### Scenario: Company data unavailable
- **WHEN** a fonte publica nao retornar dados para o CNPJ
- **THEN** o sistema SHALL rejeitar o cadastro informando que nao foi possivel obter dados

#### Scenario: Company data available
- **WHEN** a fonte publica retornar razao social, nome fantasia, contato, situacao e endereco
- **THEN** o sistema SHALL armazenar esses dados na corretora

### Requirement: Address validation
O sistema SHALL validar o CEP retornado pela fonte de CNPJ antes de persistir a corretora.

#### Scenario: Missing CEP
- **WHEN** os dados de CNPJ nao possuirem CEP
- **THEN** o sistema SHALL rejeitar o cadastro

#### Scenario: Invalid CEP lookup
- **WHEN** a consulta de CEP nao confirmar um endereco valido
- **THEN** o sistema SHALL rejeitar o cadastro

### Requirement: Market participant indicator
O sistema SHALL calcular se a corretora e validada para o mercado financeiro com base em situacao cadastral, CNAE e denominacao.

#### Scenario: Market participant detected
- **WHEN** a empresa estiver ativa e os dados indicarem corretora, distribuidora, banco ou participante equivalente
- **THEN** o sistema SHALL marcar a corretora como validada para mercado financeiro

#### Scenario: Non-market company
- **WHEN** a empresa consultada nao indicar participante de mercado
- **THEN** o sistema SHALL persistir a corretora com indicador de validacao negativo

### Requirement: Broker queries
O sistema SHALL permitir listar corretoras e buscar uma corretora por identificador ou CNPJ.

#### Scenario: List brokers
- **WHEN** um usuario autenticado solicitar a lista de corretoras
- **THEN** o sistema SHALL retornar todas as corretoras cadastradas

#### Scenario: Find broker by CNPJ
- **WHEN** um usuario autenticado buscar corretora por CNPJ
- **THEN** o sistema SHALL retornar a corretora correspondente ou indicar que nao foi encontrada
