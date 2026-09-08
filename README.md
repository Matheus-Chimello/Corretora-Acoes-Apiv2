# API de Gestao de Acoes e Corretoras

API REST em Java 17 e Spring Boot para cadastro de corretoras e acoes, com consulta de dados reais em fontes publicas.

## Requisitos atendidos

- Cadastro de corretora a partir de CNPJ, com validacao de formato e digitos verificadores.
- Consulta de dados empresariais na Brasil API e validacao de CEP no ViaCEP antes da persistencia.
- Identificacao de instituicao do mercado financeiro por situacao cadastral, CNAE e denominacao empresarial, registrada no campo `validadaNaCvm`.
- Cotacao de acoes brasileiras pela brapi e americanas pela Alpha Vantage.
- Ticker e CNPJ unicos no banco de dados.
- Endpoints REST, DTOs, tratamento centralizado de erros e cache para CNPJ/CEP.
- Login com sessao; todos os usuarios autenticados podem operar o catalogo e a propria carteira.
- Carteira criada zerada para toda nova conta. O cadastro nao autentica automaticamente o usuario.

## Arquitetura

`Controller -> Service -> Repository -> Entity`, com DTOs de entrada e saida na API. As integracoes externas sao isoladas por portas no dominio e adapters na infraestrutura.

```text
api/controller       Endpoints HTTP e autenticacao
service              Regras de negocio
repository           Persistencia JPA
domain/model         Entidades
domain/dto           Contratos HTTP
domain/port          Contratos de integracao
infra/adapter        Implementacoes das integracoes
infra/client         Clientes OpenFeign
```

## Fontes externas

| Uso | Servico | Endpoint principal |
|---|---|---|
| Dados empresariais | Brasil API | `/api/cnpj/v1/{cnpj}` |
| Endereco | ViaCEP | `/ws/{cep}/json/` |
| Cotacao BR | brapi | `/api/quote/{ticker}` |
| Cotacao US | Alpha Vantage | `GLOBAL_QUOTE` |

As cotacoes dependem de rede, das chaves de acesso e dos limites dos provedores. Configure `BRAPI_TOKEN` para acoes brasileiras e `ALPHAVANTAGE_API_KEY` para acoes americanas. Erros de indisponibilidade, limite, credencial e recurso inexistente retornam JSON com `timestamp`, `status`, `error` e `message`.

## Configuracao

Use `.env.example` como referencia e configure as variaveis no terminal ou na configuracao de execucao da IDE. O Spring Boot nao carrega um arquivo `.env` automaticamente. Nao versione chaves reais.

| Perfil | Banco | Como ativar |
|---|---|---|
| `test` (padrao) | H2 em memoria | sem variavel adicional |
| `dev` | PostgreSQL | `SPRING_PROFILES_ACTIVE=dev` |
| `mysql` | MySQL | `SPRING_PROFILES_ACTIVE=mysql` |

Variaveis de cotacao:

```properties
BRAPI_TOKEN=sua_chave_brapi
ALPHAVANTAGE_API_KEY=sua_chave
```

No PowerShell, por exemplo:

```powershell
$env:ALPHAVANTAGE_API_KEY = "sua_chave"
$env:SPRING_PROFILES_ACTIVE = "dev"
.\mvnw.cmd spring-boot:run
```

## Execucao

Com Docker, o frontend, o backend e o PostgreSQL sao executados em containers separados:

```powershell
docker compose up -d --build
```

Abra `http://localhost:8082`. O frontend e servido pelo Nginx e encaminha as rotas da API para o backend. Para consultar a API diretamente, use `http://localhost:8081`.

Para parar os containers:

```powershell
docker compose down
```

Sem Docker, voce tambem pode executar cada parte pelo IntelliJ e pelo terminal:

```powershell
.\mvnw.cmd test
.\mvnw.cmd spring-boot:run

Set-Location src\main\front
npm.cmd install
npm.cmd run dev
```

Nesse modo, abra `http://127.0.0.1:5173`. A API fica em `http://localhost:8080`.

Perfis locais iniciais: `admin@corretora.local` / `admin123` e `usuario@corretora.local` / `user123`. Altere essas credenciais em qualquer ambiente compartilhado.

Defina `BRAPI_TOKEN` e `ALPHAVANTAGE_API_KEY` no arquivo `.env` antes de iniciar a aplicação. As chaves ficam somente no backend, nunca no frontend ou no Git. A BRAPI deve ser autenticada pelo cabeçalho `Authorization`, evitando que o token apareça na URL ou nos logs.

## Autenticacao e permissoes

1. `POST /auth/login` retorna um token de sessao.
2. Envie `Authorization: Bearer <token>` nas rotas protegidas.
3. Todos os usuarios autenticados podem cadastrar corretoras e ativos, atualizar cotacoes, aportar, comprar e vender.
4. As operacoes financeiras continuam restritas a carteira do proprio usuario.

`POST /auth/register` cria uma conta `USER`, uma carteira com saldos `0` e retorna o usuario sem token. O login e uma etapa separada.

## Endpoints obrigatorios

| Metodo | Rota | Regra |
|---|---|---|
| POST | `/corretoras` | usuario autenticado; recebe somente `cnpj` |
| GET | `/corretoras` | lista corretoras |
| GET | `/corretoras/{id}` | busca por ID |
| GET | `/corretoras/cnpj/{cnpj}` | busca por CNPJ |
| POST | `/acoes` | usuario autenticado; consulta cotacao e cria ticker unico no catalogo |
| GET | `/acoes` | lista acoes cadastradas |
| GET | `/acoes/{id}` | busca por ID |
| GET | `/acoes/ticker/{ticker}` | busca por ticker |
| PUT | `/acoes/{id}/atualizar-cotacao` | usuario autenticado; atualiza pela API adequada |

Operacoes da carteira: `POST /carteiras/principal/aportes` adiciona saldo, `POST /carteiras/principal/acoes/{acaoId}/compras` registra a compra com a corretora escolhida, `POST /carteiras/principal/posicoes/{posicaoId}/vendas` registra uma venda com valor unitario informado, `GET /carteiras/principal/posicoes` lista as posicoes com preco medio por corretora, e `GET /carteiras/principal/transacoes` retorna o historico de compras e vendas.

## Diagrama ER

```mermaid
erDiagram
    USUARIO ||--o{ CARTEIRA : possui
    CARTEIRA ||--o{ POSICAO_CARTEIRA : contem
    ACAO ||--o{ POSICAO_CARTEIRA : compoe
    CORRETORA ||--o{ POSICAO_CARTEIRA : intermedia
    CARTEIRA ||--o{ TRANSACAO_CARTEIRA : registra
    ACAO ||--o{ TRANSACAO_CARTEIRA : negociada
    CORRETORA ||--o{ TRANSACAO_CARTEIRA : executa

    USUARIO {
        UUID id PK
        string nome
        string email UK
        string papel
    }
    CARTEIRA {
        long id PK
        decimal saldo_acao
        decimal saldo_em_conta
        UUID usuario_id FK
    }
    CORRETORA {
        UUID id PK
        string cnpj UK
        boolean validada_na_cvm
    }
    ACAO {
        UUID id PK
        string ticker UK
        string mercado
        decimal cotacao_atual
    }
    POSICAO_CARTEIRA {
        UUID id PK
        long carteira_id FK
        UUID acao_id FK
        UUID corretora_id FK
        decimal quantidade_total
        decimal preco_medio
    }
    TRANSACAO_CARTEIRA {
        UUID id PK
        long carteira_id FK
        UUID acao_id FK
        UUID corretora_id FK
        string tipo
        decimal quantidade
        decimal preco_unitario
        decimal valor_total
        datetime data_hora
    }
```

## Testes e collection

Execute `./mvnw.cmd test` para os testes unitarios e de contexto. A collection atualizada esta em [docs/postman_collection.json](docs/postman_collection.json); ela mantem tokens separados para administrador e investidor. Primeiro crie a corretora e o ativo; depois execute o login do investidor, o aporte, a compra com corretora, a venda e a consulta ao historico.
