## Purpose

Define validacao de CEP por fonte publica para confirmar endereco antes do cadastro de corretoras.

## ADDED Requirements

### Requirement: Postal code lookup
O sistema SHALL consultar uma fonte publica de CEP para validar e completar endereco.

#### Scenario: Successful CEP lookup
- **WHEN** o CEP informado existir na fonte publica
- **THEN** o sistema SHALL disponibilizar CEP, logradouro, complemento, bairro, localidade e UF

#### Scenario: CEP not found
- **WHEN** a fonte publica indicar que o CEP nao existe
- **THEN** o sistema SHALL tratar a validacao como reprovada

### Requirement: Address validation gate
O sistema SHALL impedir cadastro de corretora quando o CEP nao puder ser validado.

#### Scenario: Broker address validation fails
- **WHEN** o CEP obtido para a corretora nao for validado
- **THEN** o sistema SHALL rejeitar o cadastro da corretora

### Requirement: CEP lookup caching
O sistema SHALL reutilizar resultados de consulta de CEP quando o mesmo CEP for solicitado repetidamente dentro do ciclo de cache.

#### Scenario: Repeated CEP lookup
- **WHEN** o mesmo CEP for consultado mais de uma vez enquanto houver cache valido
- **THEN** o sistema SHALL evitar consulta externa redundante

### Requirement: Integration failure behavior
O sistema SHALL tratar falhas da fonte publica de CEP de forma controlada.

#### Scenario: CEP provider failure
- **WHEN** a fonte publica de CEP falhar ou ficar indisponivel
- **THEN** o sistema SHALL considerar a validacao indisponivel e impedir persistencia dependente dela
