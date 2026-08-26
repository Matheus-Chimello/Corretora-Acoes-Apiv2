## Purpose

Define como a plataforma deve consultar dados publicos de CNPJ e identificar empresas aptas ao mercado financeiro.

## ADDED Requirements

### Requirement: Company document lookup
O sistema SHALL consultar uma fonte publica de CNPJ para recuperar dados cadastrais de uma empresa.

#### Scenario: Successful CNPJ lookup
- **WHEN** a fonte publica retornar dados para o CNPJ informado
- **THEN** o sistema SHALL disponibilizar razao social, nome fantasia, CNAE principal, contato, endereco e situacao cadastral

#### Scenario: Empty CNPJ lookup
- **WHEN** a fonte publica nao retornar dados para o CNPJ
- **THEN** o sistema SHALL tratar a consulta como sem resultado

### Requirement: Active company detection
O sistema SHALL considerar a situacao cadastral da empresa ao avaliar participacao de mercado.

#### Scenario: Inactive company
- **WHEN** a empresa nao estiver ativa na fonte publica
- **THEN** o sistema SHALL considera-la nao validada como participante de mercado

### Requirement: Market participant detection
O sistema SHALL identificar participante de mercado por CNAE financeiro ou termos equivalentes na denominacao empresarial.

#### Scenario: Financial CNAE
- **WHEN** o CNAE principal indicar atividade financeira ou auxiliar de mercado financeiro
- **THEN** o sistema SHALL considerar a empresa candidata a participante de mercado

#### Scenario: Market keywords
- **WHEN** razao social, nome fantasia ou descricao de atividade contiver termos de corretora, distribuidora, banco, CCTVM ou DTVM
- **THEN** o sistema SHALL considerar a empresa candidata a participante de mercado

### Requirement: Integration failure behavior
O sistema SHALL tratar falhas da fonte publica de CNPJ de forma controlada.

#### Scenario: CNPJ provider timeout
- **WHEN** a fonte publica falhar ou ficar indisponivel
- **THEN** o sistema SHALL retornar falha de consulta externa ou resultado negativo conforme a operacao solicitada

### Requirement: CNPJ lookup caching
O sistema SHALL reutilizar resultados de consulta de CNPJ quando a mesma chave for solicitada repetidamente dentro do ciclo de cache.

#### Scenario: Repeated CNPJ lookup
- **WHEN** o mesmo CNPJ for consultado mais de uma vez enquanto houver cache valido
- **THEN** o sistema SHALL evitar consulta externa redundante
