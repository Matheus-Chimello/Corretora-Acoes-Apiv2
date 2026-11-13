# Corretora Ações

Projeto acadêmico de gestão de ações, corretoras e carteiras de investimento no Brasil e nos Estados Unidos. Cada conta tem seu próprio catálogo de ativos, saldos em reais e dólares e histórico de aportes, compras, vendas e transferências. O sistema registra as operações informadas pelo usuário para acompanhar sua carteira.

[Executar com Docker](#executar-com-docker) · [Primeiro acesso](#primeiro-acesso) · [Como usar](#como-usar) · [API REST](#api-rest) · [Testes e cobertura](#testes-e-cobertura)

## Executar com Docker

Você precisa de Git, Docker e Docker Compose. As imagens compilam o backend e o frontend, então os comandos abaixo podem ser executados em uma máquina sem Java ou Node.js instalados.

### 1. Baixe e configure o projeto

```bash
git clone https://github.com/Matheus-Chimello/Corretora-Acoes-Apiv2.git
cd Corretora-Acoes-Apiv2
```

Na raiz, copie [`.env.example`](.env.example) para `.env`.

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# Linux, macOS ou Git Bash
cp .env.example .env
```

Para iniciar o ambiente, configure `POSTGRES_PASSWORD`, `JWT_SECRET`, `APP_ADMIN_USERNAME` e `APP_ADMIN_PASSWORD`. Preencha as chaves dos provedores conforme o mercado que deseja consultar.

| Variável | Para que serve |
| --- | --- |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL local usado pelo Docker. `POSTGRES_DB` e `POSTGRES_USER` definem o nome do banco e o usuário. |
| `JWT_SECRET` | Chave de assinatura dos tokens, com pelo menos 32 bytes. Se tiver OpenSSL, gere uma com `openssl rand -base64 32`. |
| `APP_ADMIN_USERNAME` | E-mail do administrador inicial. O modelo usa `admin@corretora.local`. |
| `APP_ADMIN_PASSWORD` | Senha do administrador inicial, entre 8 e 72 caracteres. |
| `BRAPI_TOKEN` | Token necessário para as cotações brasileiras, inclusive no carrossel de login. A aplicação também tenta usá-lo para ações dos EUA. |
| `ALPHAVANTAGE_API_KEY` | Chave usada como alternativa para ações dos EUA quando a brapi falha na consulta. |
| `JWT_EXPIRATION` e `JWT_ISSUER` | Validade do token, com padrão de `60m`, e identificação do emissor. |

Use credenciais próprias para o ambiente local. O arquivo `.env` é ignorado pelo Git.

### 2. Inicie os serviços

```bash
docker compose up -d --build
docker compose ps
```

| Serviço | Endereço local padrão |
| --- | --- |
| Site | [http://localhost:8082](http://localhost:8082/) |
| API | `http://localhost:8081` |
| PostgreSQL | `localhost:5433` |

As portas publicadas são configuráveis em `FRONTEND_PORT`, `BACKEND_PORT` e `POSTGRES_PORT`. O Nginx entrega o frontend e encaminha as chamadas da API para o Spring Boot. O Liquibase aplica as migrações na inicialização, e o PostgreSQL guarda os dados no volume `postgres_data`.

Para acompanhar a inicialização, use `docker compose logs -f backend`. Use `docker compose stop` para pausar os serviços preservando os dados.

## Primeiro acesso

1. Abra o site e entre com `APP_ADMIN_USERNAME` e `APP_ADMIN_PASSWORD`. No perfil `dev`, a aplicação cria o administrador inicial quando o e-mail configurado ainda não existe.
2. Abra **Administração → Novo usuário**, preencha nome, e-mail e senha inicial e escolha **Usuário** para criar uma conta de investimento.
3. Em **Corretoras**, cadastre pelo CNPJ uma instituição válida para as operações da carteira.
4. Saia da conta administrativa e entre com o usuário criado para acessar **Visão geral**, **Carteira**, **Corretoras** e **Ações**.

O painel administrativo fica em `/#/admin/usuarios` e o cadastro de corretoras em `/#/admin/corretoras`. Para um administrador já cadastrado, a senha fica no banco e pode ser alterada em **Minha conta**.

### Perfis e permissões

| Ação na interface | Usuário comum (`USER`) | Administrador (`ADMIN`) |
| --- | --- | --- |
| Acessar a Visão geral, o catálogo de Ações e a Carteira | Na própria conta | A interface abre a Administração |
| Consultar a lista de corretoras | Corretoras validadas | Todas, com status de validação |
| Cadastrar e revalidar corretoras | Não | Sim |
| Criar contas, alterar perfis, ativar ou inativar usuários e redefinir senhas | Não | Sim |
| Trocar a própria senha e escolher o tema em **Minha conta** | Sim | Sim |

A API limita o catálogo, as posições, o caixa e o histórico ao titular identificado pelo JWT, inclusive nas chamadas de `ADMIN`. Mudanças de perfil e inativação invalidam os tokens em uso da conta afetada. A aplicação protege o último administrador ativo e registra no **Histórico administrativo** as mudanças de perfil, as inativações e as revalidações de corretoras. [Detalhes da autenticação e do controle de acesso](docs/AUTENTICACAO.md)

## Como usar

### Cadastrar ativos e atualizar cotações

Em **Ações**, informe o ticker e selecione o mercado. A aplicação consulta uma cotação externa e grava o ativo no catálogo da sua conta. Ações do Brasil usam `BRL` e as dos EUA usam `USD`. Se a moeda retornada indicar outro mercado, o formulário seleciona o mercado sugerido e pede sua confirmação antes de cadastrar.

Ao entrar, o sistema tenta atualizar as cotações do catálogo. Se algum provedor falhar, o acesso continua com os últimos valores disponíveis para aqueles ativos. A coluna **Atualização** mostra a data e a hora da cotação salva. As telas **Ações** e **Carteira** também oferecem atualização manual. Antes do login, o carrossel mostra indicadores públicos. Depois do login, usa o catálogo da conta quando houver cotações disponíveis.

### Movimentar a carteira

| Operação | Como funciona |
| --- | --- |
| **Aporte** | Escolha BRL ou USD e informe o valor para adicionar ao saldo da moeda escolhida. |
| **Compra** | Selecione o ativo e uma corretora validada. A compra usa a cotação salva ou o valor unitário informado, debita o saldo da moeda do ativo e atualiza o preço médio da posição naquela corretora. |
| **Venda** | Informe a quantidade e o valor unitário. A operação reduz a posição e credita o total no saldo da mesma moeda. |
| **Transferência** | Mova parte ou toda a posição para outra corretora. O histórico registra a saída e a entrada do ativo, e o saldo em caixa é preservado. |

A Carteira exibe quantidade, preço médio, cotação, valor atual e resultado por posição. Use os filtros das tabelas para localizar ativos, corretoras e movimentações. A migração para duas moedas mantém o saldo anterior em BRL e inicia o saldo em USD com zero.

### Acompanhar a evolução e ocultar valores

- **Evolução patrimonial.** Em **Visão geral**, escolha **30 dias**, **90 dias** ou **Histórico completo**. Os períodos filtrados começam pelo patrimônio de abertura. Os pontos históricos somam caixa e custo das posições. O ponto **Hoje** usa as cotações disponíveis.
- **Modo privacidade.** Use o botão com ícone de olho na **Visão geral** ou na **Carteira** para ocultar saldos, quantidades, valores do histórico, rentabilidade e gráficos com dados da carteira durante apresentações. As cotações de mercado seguem visíveis. A preferência acompanha a navegação e a recarga na mesma aba.
- **Tema.** Em **Minha conta → Aparência**, escolha **Claro** ou **Escuro**. O navegador salva a escolha.

### Entender a validação de corretoras

No cadastro, o backend verifica os dígitos do CNPJ, consulta a empresa na BrasilAPI e verifica o CEP no ViaCEP. O status de validação é calculado pelo projeto com base nos dados cadastrais públicos, como situação da empresa e atividade econômica. O administrador pode revalidar uma corretora e consultar a fonte, a data e o resultado. Quando a consulta falha, o último status é preservado.

## API REST

A URL base no Docker é `http://localhost:8081`. Importe a [coleção Postman](docs/postman_collection.json) e ajuste a variável `baseUrl`, que vem configurada para `http://localhost:8080` na execução direta do Spring.

### Login e token

Envie `POST /auth/login` com `Content-Type: application/json` e os dados da sua conta local. O exemplo usa valores fictícios.

```json
{
  "email": "usuario@exemplo.local",
  "password": "SENHA_DA_CONTA_LOCAL"
}
```

A resposta inclui `token`, `tipo`, `expiresIn` em segundos, `nome`, `email`, `role` e `cotacoesAtualizadas`. Nas rotas protegidas, envie `Authorization: Bearer <token>`. A API retorna `401` para autenticação ausente ou inválida e `403` quando o perfil autenticado não tem a permissão exigida.

### Principais rotas

| Método e rota | Acesso | Finalidade |
| --- | --- | --- |
| `GET /api/mercado/cotacoes` | Público | Consultar os indicadores do carrossel de login. |
| `GET /auth/me` | Autenticado | Consultar identidade e permissões. |
| `PUT /auth/me/senha` | Autenticado | Alterar a própria senha com `senhaAtual` e `novaSenha`. |
| `GET /acoes` e `POST /acoes` | Autenticado | Listar e cadastrar ativos no catálogo da conta. |
| `GET /acoes/ticker/{ticker}` | Autenticado | Consultar um ativo do próprio catálogo pelo ticker. |
| `PUT /acoes/{id}/atualizar-cotacao` | Autenticado | Atualizar a cotação de um ativo da conta. |
| `PUT /acoes/atualizar-cotacoes` | Autenticado | Atualizar as cotações do catálogo da conta. |
| `GET /carteiras/principal` | Autenticado | Consultar a carteira e os saldos em BRL e USD. |
| `GET /carteiras/principal/posicoes` | Autenticado | Consultar as posições da carteira. |
| `GET /carteiras/principal/transacoes` | Autenticado | Consultar o histórico de movimentações. |
| `POST /carteiras/principal/aportes` | Autenticado | Registrar aporte com `valor` e `moeda`. |
| `POST /carteiras/principal/acoes/{acaoId}/compras` | Autenticado | Comprar com `corretoraId`, `quantidade` e `valorUnitario` opcional. |
| `POST /carteiras/principal/posicoes/{posicaoId}/vendas` | Autenticado | Vender com `quantidade` e `valorUnitario`. |
| `POST /carteiras/principal/posicoes/{posicaoId}/transferencias` | Autenticado | Transferir com `corretoraDestinoId` e `quantidade`. |
| `GET /corretoras` | Autenticado | Listar as corretoras visíveis para o perfil. |
| `POST /corretoras` | `ADMIN` | Cadastrar uma corretora pelo `cnpj`. |
| `POST /corretoras/{id}/revalidar` | `ADMIN` | Consultar novamente a validação de uma corretora. |
| `GET /api/usuarios` e `POST /api/usuarios` | `ADMIN` | Listar ou criar contas. |
| `PUT /api/usuarios/{id}` e `PUT /api/usuarios/{id}/senha` | `ADMIN` | Atualizar cadastro e perfil ou redefinir a senha. |
| `GET /api/admin/historico?pagina=0` | `ADMIN` | Consultar o histórico administrativo por página. |

## Solução de problemas

| Sintoma | O que verificar |
| --- | --- |
| O backend não inicia | Rode `docker compose logs --tail=80 backend` e confira as variáveis do banco, a chave JWT e a senha do administrador inicial. |
| Uma porta está ocupada | Ajuste a porta correspondente no `.env`, rode `docker compose up -d` e use o novo endereço no navegador ou no Postman. |
| As cotações não carregam | Confira `BRAPI_TOKEN` e, para a fonte alternativa nos EUA, `ALPHAVANTAGE_API_KEY`. As chamadas aos provedores saem do backend. |
| O login do administrador inicial falha | Confira o e-mail, o perfil `dev` e a senha da conta. Se o banco já tinha essa conta, a aplicação usa a senha cadastrada nela. |

## Arquitetura e tecnologias

| Parte | Implementação |
| --- | --- |
| Backend | Java 17, Spring Boot, Spring Security com JWT, Spring Data JPA e Maven Wrapper. |
| Frontend | React, Vite, React Router e Recharts. |
| Dados | PostgreSQL 17 no Docker com o perfil `dev`, H2 em memória no perfil `test` e configuração alternativa no perfil `mysql`. O Liquibase versiona as migrações. |
| Integrações | OpenFeign e Spring `RestClient`, acessados por portas e adaptadores. |
| Execução | Docker Compose com containers separados para frontend Nginx, backend e PostgreSQL. |

Os controllers recebem as requisições e usam DTOs para os contratos da API. Os serviços concentram as regras de negócio e os repositórios acessam os dados. Os adaptadores isolam as consultas de mercado e de cadastro empresarial.

```text
src/main/front/                     Telas React, componentes, estilos e testes
src/main/java/com/projeto/gestao/   API, domínio, serviços e persistência
src/main/resources/db/changelog/    Migrações do Liquibase
src/test/java/                     Testes automatizados do backend
docs/                              Guias e coleção Postman
.github/workflows/                 Verificações do GitHub Actions
```

### Serviços externos

| Serviço | Uso no projeto |
| --- | --- |
| [brapi](https://brapi.dev/) | Fonte de cotações brasileiras e primeira tentativa de consulta para tickers americanos. |
| [Alpha Vantage](https://www.alphavantage.co/) | Alternativa de cotação para o mercado americano. |
| [BrasilAPI](https://brasilapi.com.br/) | Consulta de dados cadastrais por CNPJ. |
| [ViaCEP](https://viacep.com.br/) | Consulta de endereço por CEP no cadastro de corretoras. |

### Desenvolvimento fora do Docker

Use Java 17, Node.js 22 e um PostgreSQL acessível. Na configuração do backend no IntelliJ ou no terminal, informe `SPRING_PROFILES_ACTIVE=dev`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `APP_ADMIN_USERNAME` e `APP_ADMIN_PASSWORD`. Defina também as variáveis dos provedores que for usar. Na execução direta, configure essas variáveis no processo ou na IDE.

Na raiz do projeto, rode `./mvnw spring-boot:run` no Linux ou macOS, ou `.\mvnw.cmd spring-boot:run` no PowerShell. O backend abre em `http://localhost:8080` por padrão.

Em outro terminal, entre em `src/main/front` e aponte o Vite para a API local.

```powershell
npm ci
$env:VITE_API_BASE_URL = 'http://localhost:8080'
npm run dev
```

Em Bash, use `VITE_API_BASE_URL=http://localhost:8080 npm run dev` depois de `npm ci`. A interface de desenvolvimento fica em `http://localhost:5173`.

## Testes e cobertura

O backend usa JUnit 5, Mockito, MockMvc e JaCoCo. Os testes de integração usam o perfil `test`, banco H2 em memória e dados fictícios. O frontend usa Vitest e Testing Library para verificar a navegação, as permissões e os fluxos das telas.

Execute os testes Java na raiz do projeto.

```powershell
$env:SPRING_PROFILES_ACTIVE = 'test'
.\mvnw.cmd verify
```

Em Bash, o equivalente é `SPRING_PROFILES_ACTIVE=test ./mvnw verify`. Abra `target/site/jacoco/index.html` para consultar o relatório.

Para o frontend, rode os comandos em `src/main/front`.

```bash
npm ci
npm run test:coverage
```

Abra `src/main/front/coverage/index.html` a partir da raiz. O backend exige **80% de linhas e ramificações**. O frontend exige **80% de linhas, ramificações, funções e instruções**. O GitHub Actions roda as verificações em pushes e pull requests. [Guia de testes](docs/TESTES.md) · [Workflow](.github/workflows/tests.yml)

| Verificação local | Testes aprovados | Linhas | Ramificações |
| --- | ---: | ---: | ---: |
| Backend | 142 | 95,27% | 85,50% |
| Frontend | 115 | 96,56% | 88,98% |

## Contribuição

Use dados fictícios no perfil `test`, cubra os comportamentos novos com testes e rode as duas suítes antes de publicar mudanças. Para ativar o hook de validação em um novo clone, execute `git config core.hooksPath .githooks`. [Orientações do projeto](AGENTS.md) · [Configuração dos checks no GitHub](docs/CONFIGURACAO-GITHUB.md)
