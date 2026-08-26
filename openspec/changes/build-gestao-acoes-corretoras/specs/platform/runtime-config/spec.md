## Purpose

Define como a aplicacao deve ser configurada, executada e empacotada em ambientes locais e conteinerizados.

## ADDED Requirements

### Requirement: Runtime profiles
O sistema SHALL suportar perfis de execucao para testes locais, desenvolvimento com banco relacional e execucao alternativa com MySQL.

#### Scenario: Default test profile
- **WHEN** a aplicacao iniciar sem perfil explicito
- **THEN** o sistema SHALL usar o perfil local de teste com banco em memoria

#### Scenario: Development database profile
- **WHEN** o perfil de desenvolvimento for selecionado
- **THEN** o sistema SHALL conectar ao banco relacional configurado por variaveis de ambiente

#### Scenario: MySQL database profile
- **WHEN** o perfil MySQL for selecionado
- **THEN** o sistema SHALL conectar ao MySQL usando URL, usuario e senha configuraveis

### Requirement: External API credentials
O sistema SHALL ler tokens e chaves de provedores externos por configuracao de ambiente, sem exigir segredos versionados no repositorio.

#### Scenario: Quote provider token configured
- **WHEN** uma chave ou token externo estiver configurado
- **THEN** o sistema SHALL usa-lo nas chamadas ao provedor correspondente

#### Scenario: Missing mandatory quote credential
- **WHEN** uma consulta exigir credencial obrigatoria que nao foi configurada
- **THEN** o sistema SHALL retornar erro explicito para a operacao solicitada

### Requirement: Static frontend packaging
O sistema SHALL permitir que o frontend seja empacotado junto com o backend para distribuicao em um unico artefato executavel.

#### Scenario: Production package
- **WHEN** o pacote de producao for gerado
- **THEN** o sistema SHALL incluir os arquivos estaticos da interface web no artefato do servidor

### Requirement: Containerized execution
O sistema SHALL disponibilizar uma forma conteinerizada de executar a aplicacao com banco relacional e servidor HTTP.

#### Scenario: Container startup
- **WHEN** o ambiente conteinerizado for iniciado
- **THEN** o banco SHALL ficar disponivel antes da aplicacao aceitar trafego

#### Scenario: Published application port
- **WHEN** a aplicacao for executada em container
- **THEN** o servidor SHALL publicar uma porta configuravel para acesso HTTP
