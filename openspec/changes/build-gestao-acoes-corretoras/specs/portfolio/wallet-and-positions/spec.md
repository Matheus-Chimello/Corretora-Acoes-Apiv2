## Purpose

Define carteiras individuais, aportes, compras, vendas, posicoes e saldos financeiros associados a cada usuario.

## ADDED Requirements

### Requirement: Principal wallet
O sistema SHALL garantir uma carteira principal para cada usuario autenticado.

#### Scenario: Wallet exists
- **WHEN** o usuario ja possuir carteira
- **THEN** o sistema SHALL retornar a carteira existente

#### Scenario: Wallet missing
- **WHEN** o usuario autenticado nao possuir carteira
- **THEN** o sistema SHALL criar uma carteira zerada e retorna-la

### Requirement: Cash contribution
O sistema SHALL permitir adicionar saldo em conta na carteira principal.

#### Scenario: Successful contribution
- **WHEN** o usuario autenticado informar valor positivo de aporte
- **THEN** o sistema SHALL somar o valor ao saldo em conta da carteira

#### Scenario: Invalid contribution value
- **WHEN** o valor de aporte for nulo, zero ou negativo
- **THEN** o sistema SHALL rejeitar o aporte

### Requirement: Asset purchase
O sistema SHALL permitir comprar acoes do catalogo usando saldo em conta da carteira do usuario.

#### Scenario: Successful purchase
- **WHEN** o usuario possuir saldo suficiente e informar quantidade positiva para uma acao cadastrada
- **THEN** o sistema SHALL atualizar a cotacao, reduzir saldo em conta, criar ou atualizar a posicao e recalcular saldo em acoes

#### Scenario: Insufficient cash balance
- **WHEN** o custo da compra for maior que o saldo em conta disponivel
- **THEN** o sistema SHALL rejeitar a compra

#### Scenario: Invalid purchase quantity
- **WHEN** a quantidade de compra for nula, zero ou negativa
- **THEN** o sistema SHALL rejeitar a compra

### Requirement: Average price calculation
O sistema SHALL calcular preco medio ponderado quando novas compras forem feitas para uma posicao existente.

#### Scenario: Additional purchase
- **WHEN** o usuario comprar mais quantidade de uma acao que ja possui
- **THEN** o sistema SHALL recalcular o preco medio usando quantidade anterior, preco medio anterior, quantidade comprada e cotacao atual

### Requirement: Asset sale
O sistema SHALL permitir vender quantidade disponivel de uma acao presente na carteira do usuario.

#### Scenario: Successful partial sale
- **WHEN** o usuario vender quantidade positiva menor que a quantidade disponivel
- **THEN** o sistema SHALL atualizar a cotacao, aumentar saldo em conta, reduzir a quantidade da posicao e recalcular saldo em acoes

#### Scenario: Successful full sale
- **WHEN** o usuario vender toda a quantidade disponivel de uma posicao
- **THEN** o sistema SHALL remover a posicao ativa da carteira e recalcular saldo em acoes

#### Scenario: Sale above available quantity
- **WHEN** a quantidade de venda for maior que a quantidade disponivel
- **THEN** o sistema SHALL rejeitar a venda

### Requirement: Wallet isolation
O sistema SHALL restringir consultas e operacoes de carteira aos dados do usuario autenticado.

#### Scenario: List own wallets
- **WHEN** o usuario autenticado listar carteiras
- **THEN** o sistema SHALL retornar apenas carteiras vinculadas ao proprio usuario

#### Scenario: Find wallet by id
- **WHEN** o usuario autenticado buscar carteira por identificador
- **THEN** o sistema SHALL retornar somente se a carteira pertencer ao usuario

### Requirement: Position listing
O sistema SHALL listar somente posicoes ativas com quantidade maior que zero.

#### Scenario: User positions
- **WHEN** o usuario autenticado solicitar suas posicoes
- **THEN** o sistema SHALL retornar ticker, empresa, mercado, moeda, quantidade, cotacao, preco medio, valor atual e corretora relacionada
