# OpenSpec - Aula 12 - Docker e Docker Compose

## Objetivo

Produzir a configuracao Docker do projeto `gestao-acoes-corretoras`, permitindo executar a aplicacao Spring Boot e um PostgreSQL 17 por Docker Compose, com dados persistidos em volume e variaveis sensiveis fora do Git.

## Escopo

Esta especificacao cobre:

- criacao de `.dockerignore`;
- criacao de `Dockerfile`;
- criacao de `compose.yaml`;
- atualizacao de `.env.example`;
- orientacao para atualizar o `.env` local;
- comandos de validacao, build, subida, logs e parada dos containers.

Esta especificacao nao cobre:

- containerizacao do front React/Vite;
- publicacao da imagem em registry;
- configuracao de ambiente de producao;
- alteracao de credenciais reais em arquivos versionados.

## Contexto do projeto

- Aplicacao backend: Spring Boot com Maven e Java 17.
- Artefato Maven: `gestao-acoes-corretoras`.
- Banco esperado pelo projeto: `acoes_corretoradb`.
- Perfil Spring para banco PostgreSQL: `dev`.
- Porta interna da aplicacao: `8080`.
- Porta interna do PostgreSQL: `5432`.
- O projeto pode estar em transicao entre variaveis `POSTGRES_*` e `DB_*`.

## Requisitos Funcionais

### RF01 - Build da imagem da aplicacao

O projeto deve ter um `Dockerfile` multi-stage:

- etapa `build` usando `maven:3.9.11-eclipse-temurin-17`;
- etapa `runtime` usando `eclipse-temurin:17-jre-jammy`;
- build Maven com testes pulados dentro da imagem;
- copia apenas do JAR final para a imagem runtime;
- execucao com usuario sem privilegio chamado `spring`;
- exposicao documental da porta `8080`;
- `ENTRYPOINT` executando `java -jar app.jar`.

### RF02 - Compose com PostgreSQL

O `compose.yaml` deve declarar o servico `postgres`:

- imagem `postgres:17-alpine`;
- `restart: unless-stopped`;
- banco configuravel por `POSTGRES_DB`;
- usuario configuravel por `POSTGRES_USER`;
- senha obrigatoria por `POSTGRES_PASSWORD`;
- porta externa configuravel por `POSTGRES_PORT`;
- volume nomeado para persistencia;
- healthcheck com `pg_isready`.

### RF03 - Compose com aplicacao

O `compose.yaml` deve declarar o servico `aplicacao`:

- build local usando `Dockerfile`;
- imagem nomeada `gestao-acoes-corretoras:local`;
- dependencia do `postgres` saudavel;
- `restart: unless-stopped`;
- porta externa configuravel por `APP_PORT`;
- perfil Spring `dev`.

Para compatibilidade com o estado atual e com a padronizacao das aulas, o container da aplicacao deve receber os dois conjuntos de variaveis:

```yaml
SPRING_PROFILES_ACTIVE: dev
DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-acoes_corretoradb}
DB_USERNAME: ${POSTGRES_USER:-postgres}
DB_PASSWORD: ${POSTGRES_PASSWORD}
POSTGRES_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-acoes_corretoradb}
POSTGRES_USER: ${POSTGRES_USER:-postgres}
POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
```

### RF04 - Variaveis de ambiente

O `.env.example` deve documentar pelo menos:

```dotenv
# Variaveis utilizadas pelo Docker Compose
POSTGRES_DB=acoes_corretoradb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=troque-esta-senha
POSTGRES_PORT=5433
APP_PORT=8081
```

O `.env` local deve conter os valores reais, mas nao deve ser versionado.

### RF05 - Protecao do contexto Docker

O `.dockerignore` deve impedir que arquivos desnecessarios ou sensiveis entrem no contexto de build:

- `.git`;
- `.idea`;
- `.vscode`;
- `target`;
- `build`;
- `*.log`;
- `.env`;
- `.env.*`;
- `node_modules`;
- `src/main/front/dist`;
- arquivos temporarios do sistema.

## Requisitos Nao Funcionais

### RNF01 - Seguranca

- A senha do banco nao deve aparecer no `Dockerfile`, `compose.yaml` ou arquivos versionados.
- O `.env` deve continuar ignorado pelo Git.
- O `.env` tambem deve ser ignorado pelo Docker via `.dockerignore`.
- A aplicacao nao deve rodar como usuario `root` no container final.

### RNF02 - Portas

Como o computador pode ja ter PostgreSQL local em `5432` e backend local em `8080`, os valores padrao sugeridos para Docker devem ser:

```dotenv
POSTGRES_PORT=5433
APP_PORT=8081
```

Assim:

- acesso externo ao PostgreSQL Docker: `localhost:5433`;
- acesso externo a aplicacao Docker: `localhost:8081`;
- comunicacao interna entre containers: `postgres:5432`.

### RNF03 - Persistencia

O PostgreSQL deve usar volume nomeado `postgres_data`. O comando `docker compose down` nao deve apagar dados. Apenas `docker compose down -v` deve remover o banco da composicao.

## Arquivos Esperados

```text
.dockerignore
.env.example
Dockerfile
compose.yaml
```

## Conteudo Esperado - Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

FROM maven:3.9.11-eclipse-temurin-17 AS build

WORKDIR /workspace

COPY pom.xml .
RUN mvn -q -DskipTests dependency:go-offline

COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:17-jre-jammy AS runtime

WORKDIR /app

RUN groupadd --system spring && useradd --system --gid spring spring

COPY --from=build --chown=spring:spring /workspace/target/*.jar app.jar

USER spring:spring

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Conteudo Esperado - compose.yaml

```yaml
name: gestao-acoes-corretoras

services:
  postgres:
    image: postgres:17-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-acoes_corretoradb}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${POSTGRES_PORT:-5433}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-postgres} -d ${POSTGRES_DB:-acoes_corretoradb}"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

  aplicacao:
    build:
      context: .
      dockerfile: Dockerfile
    image: gestao-acoes-corretoras:local
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      SPRING_PROFILES_ACTIVE: dev
      DB_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-acoes_corretoradb}
      DB_USERNAME: ${POSTGRES_USER:-postgres}
      DB_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_URL: jdbc:postgresql://postgres:5432/${POSTGRES_DB:-acoes_corretoradb}
      POSTGRES_USER: ${POSTGRES_USER:-postgres}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    ports:
      - "${APP_PORT:-8081}:8080"

volumes:
  postgres_data:
```

## Conteudo Esperado - .dockerignore

```dockerignore
# Controle de versao e configuracoes das IDEs
.git
.gitignore
.idea
.vscode
*.iml

# Arquivos gerados pelo build e pela aplicacao
target
build
*.class
*.log

# Segredos e configuracoes locais
.env
.env.*

# Frontend e dependencias locais
node_modules
src/main/front/node_modules
src/main/front/dist

# Arquivos que nao sao necessarios para compilar a aplicacao
docs
README.md
.DS_Store
**/.DS_Store
```

## Validacao

Antes do commit:

```powershell
.\mvnw.cmd test
docker compose config --services
docker compose config
docker compose build
docker compose up -d
docker compose ps
```

Resultado esperado para servicos:

```text
postgres
aplicacao
```

Resultado esperado em `docker compose ps`:

- `postgres` em execucao e saudavel;
- `aplicacao` em execucao;
- API publicada na porta definida por `APP_PORT`.

## Testes Manuais

Com `APP_PORT=8081`, testar login:

```powershell
Invoke-RestMethod `
  -Uri 'http://localhost:8081/auth/login' `
  -Method Post `
  -ContentType 'application/json' `
  -Body '{"email":"admin@corretora.local","password":"admin123"}'
```

Se o projeto estiver com Liquibase ativo, conferir versionamento:

```powershell
docker compose exec postgres psql `
  -U postgres `
  -d acoes_corretoradb `
  -c "select id, author, filename from databasechangelog order by orderexecuted;"
```

## Comandos de Operacao

Subir tudo:

```powershell
docker compose up -d --build
```

Ver logs:

```powershell
docker compose logs -f aplicacao
```

Parar sem apagar dados:

```powershell
docker compose down
```

Apagar containers e banco Docker:

```powershell
docker compose down -v
```

## Criterios de Aceite

- `.dockerignore` existe e protege `.env`.
- `Dockerfile` constroi uma imagem da aplicacao Spring Boot.
- `compose.yaml` sobe PostgreSQL e aplicacao na mesma rede Compose.
- PostgreSQL usa volume nomeado.
- A aplicacao recebe variaveis de ambiente para conectar no servico `postgres`.
- `docker compose config --services` lista `postgres` e `aplicacao`.
- `docker compose up -d --build` deixa os containers em execucao.
- A API responde pela porta publicada.
- `.env` nao aparece em `git status`.
- O commit da Aula 12 nao contem segredos.

## Ponto de Versionamento Esperado

```powershell
.\mvnw.cmd test
docker compose config
docker compose build
git status
git add .dockerignore Dockerfile compose.yaml .env.example
git commit -m "Aula 12: containeriza aplicacao e PostgreSQL"
git tag -a aula-12-docker -m "Aplicacao containerizada com Docker Compose"
git push origin main --follow-tags
```
