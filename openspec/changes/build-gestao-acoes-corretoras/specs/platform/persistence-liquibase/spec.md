## Purpose

Define o contrato de persistencia relacional, evolucao de schema e dados iniciais necessarios para a plataforma.

## ADDED Requirements

### Requirement: Versioned database schema
O sistema SHALL versionar a estrutura do banco de dados por migrations aplicadas na inicializacao.

#### Scenario: Empty database startup
- **WHEN** a aplicacao iniciar com um banco vazio
- **THEN** o sistema SHALL criar todas as tabelas, constraints e relacionamentos necessarios

#### Scenario: Existing database startup
- **WHEN** a aplicacao iniciar com um banco ja migrado
- **THEN** o sistema SHALL preservar os dados existentes e aplicar apenas migrations pendentes

### Requirement: Core relational model
O banco SHALL persistir usuarios, corretoras, acoes, carteiras e posicoes de carteira com seus relacionamentos essenciais.

#### Scenario: User wallet relationship
- **WHEN** uma carteira for persistida para um usuario
- **THEN** o banco SHALL manter referencia entre carteira e usuario

#### Scenario: Asset broker relationship
- **WHEN** uma acao for cadastrada no catalogo
- **THEN** o banco SHALL manter referencia obrigatoria para a corretora relacionada

#### Scenario: Wallet asset position relationship
- **WHEN** uma posicao de carteira for persistida
- **THEN** o banco SHALL manter referencia para a carteira e para a acao negociada

### Requirement: Uniqueness constraints
O banco SHALL impedir duplicidade de identificadores de negocio que devem ser unicos.

#### Scenario: Duplicate broker document
- **WHEN** duas corretoras forem salvas com o mesmo CNPJ normalizado
- **THEN** o banco SHALL rejeitar a duplicidade

#### Scenario: Duplicate asset ticker
- **WHEN** duas acoes forem salvas com o mesmo ticker normalizado
- **THEN** o banco SHALL rejeitar a duplicidade

#### Scenario: Duplicate wallet position
- **WHEN** uma carteira tentar manter duas posicoes para a mesma acao
- **THEN** o banco SHALL rejeitar a duplicidade de carteira e acao

### Requirement: Demonstration catalog seed
O sistema SHALL poder carregar dados iniciais de demonstracao para corretoras e acoes sem depender de entrada manual.

#### Scenario: Demonstration data migration
- **WHEN** as migrations de demonstracao forem aplicadas
- **THEN** o banco SHALL conter corretoras e ativos pre-cadastrados para uso inicial
