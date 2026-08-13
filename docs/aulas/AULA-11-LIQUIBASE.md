# Java Spring Boot - Aula 11 - Versionamento do banco de dados com Liquibase

## 11.1 Objetivos da aula

Ao final desta aula o estudante devera ser capaz de:

- explicar por que o banco precisa ser versionado;
- diferenciar Hibernate/JPA de uma ferramenta de migration;
- entender changelog, changeSet, checksum e lock;
- adicionar Liquibase ao Spring Boot;
- portar o schema existente para um changelog inicial;
- iniciar bancos H2 e PostgreSQL com a mesma estrutura;
- criar uma nova evolucao sem alterar changeSets executados.

## 11.2 O problema do `ddl-auto`

Usar `spring.jpa.hibernate.ddl-auto=update` ajuda nas primeiras aulas, mas deixa a estrutura do banco sem historico explicito. Cada ambiente pode ficar diferente e o Hibernate passa a alterar o banco automaticamente.

A partir desta aula, o Liquibase cria e evolui a estrutura. O Hibernate fica apenas em modo `validate`.

## 11.3 Papeis das ferramentas

| Tecnologia | Responsabilidade |
|---|---|
| JPA | Mapear objetos Java para tabelas |
| Hibernate | Implementar o mapeamento e executar operacoes SQL |
| Liquibase | Criar e evoluir a estrutura do banco de forma versionada |

## 11.4 Dependencia Maven

No `pom.xml`, foi adicionada a dependencia:

```xml
<dependency>
    <groupId>org.liquibase</groupId>
    <artifactId>liquibase-core</artifactId>
</dependency>
```

Nao e necessario informar a versao porque o `spring-boot-starter-parent` escolhe uma versao compativel.

## 11.5 Estrutura criada

```text
src/main/resources/
|-- db/
    |-- changelog/
        |-- db.changelog-master.xml
        |-- changes/
            |-- 001-criar-estrutura-inicial.xml
```

O arquivo `db.changelog-master.xml` funciona como indice. Cada nova alteracao estrutural deve ganhar um novo arquivo na pasta `changes` e ser incluida no final do master.

## 11.6 Configuracao do Spring Boot

O arquivo `application.properties` habilita o Liquibase e aponta para o master:

```properties
spring.liquibase.enabled=true
spring.liquibase.change-log=classpath:db/changelog/db.changelog-master.xml
spring.jpa.hibernate.ddl-auto=validate
```

Os perfis `dev`, `test` e `mysql` tambem usam `ddl-auto=validate`, para evitar que o Hibernate altere a estrutura automaticamente.

## 11.7 Changelog inicial do projeto

O changelog inicial foi derivado das entidades atuais do projeto:

- `Corretora` usa a tabela `corretoras`;
- `Acao` usa a tabela `acoes`;
- `Usuario` usa a tabela `usuarios`;
- `Carteira` usa a tabela `carteira`;
- `PosicaoCarteira` usa a tabela `posicoes_carteira`;
- `acoes.ticker`, `corretoras.cnpj`, `usuarios.email` e `usuarios.token_sessao` possuem constraints unicas;
- `posicoes_carteira` possui constraint unica para o par `carteira_id` e `acao_id`;
- as chaves estrangeiras ligam carteiras a usuarios, acoes a corretoras e posicoes a carteiras e acoes.

## 11.8 Ordem de inicializacao

```text
Aplicacao inicia
      ->
DataSource conecta ao banco
      ->
Liquibase le DATABASECHANGELOG
      ->
Liquibase executa changeSets pendentes
      ->
Hibernate valida as entidades
      ->
Aplicacao fica disponivel
```

## 11.9 Tabelas de controle

Na primeira execucao, o Liquibase cria automaticamente:

- `DATABASECHANGELOG`, que registra os changeSets executados e seus checksums;
- `DATABASECHANGELOGLOCK`, que evita duas migracoes simultaneas no mesmo banco.

Essas tabelas pertencem ao controle do Liquibase e nao devem ser apagadas manualmente.

## 11.10 Regra sobre changeSets

Depois que um changeSet foi enviado ao repositorio e executado por outras pessoas, ele deve ser tratado como imutavel.

Para corrigir ou evoluir o schema, crie um novo changeSet em outro arquivo e inclua esse arquivo no final do master.

## 11.11 H2 nos testes

O perfil `test` usa H2 em memoria com modo PostgreSQL:

```properties
spring.datasource.url=jdbc:h2:mem:acoes_corretoradb;MODE=PostgreSQL;DB_CLOSE_DELAY=-1
```

Assim, os testes executam o mesmo changelog usado pela aplicacao e o Hibernate valida se as entidades combinam com a estrutura criada.

## 11.12 Primeiro uso em um banco vazio

Para usar em um PostgreSQL vazio:

1. Crie o banco `acoes_corretoradb`.
2. Configure as variaveis da Aula 10.
3. Execute a aplicacao com o perfil `dev`.
4. Observe no log os changeSets do Liquibase.
5. Consulte o historico:

```sql
select id, author, filename, dateexecuted
from databasechangelog
order by orderexecuted;
```

Na segunda execucao, os changeSets ja executados nao rodam novamente.

## 11.13 Banco ja existente

Se o PostgreSQL ja possui tabelas criadas pelo Hibernate, iniciar direto com o Liquibase pode causar erro de objeto ja existente.

Para banco didatico local, a opcao mais simples e recriar o banco depois de salvar qualquer dado importante.

Quando os dados precisam ser preservados, use uma linha de base com `liquibase changelog-sync` somente depois de conferir que a estrutura existente corresponde exatamente ao changelog.

## 11.14 Arquivos modificados

```text
pom.xml
src/main/resources/application.properties
src/main/resources/application-dev.properties
src/main/resources/application-test.properties
src/main/resources/application-mysql.properties
src/main/resources/db/changelog/db.changelog-master.xml
src/main/resources/db/changelog/changes/001-criar-estrutura-inicial.xml
docs/aulas/AULA-11-LIQUIBASE.md
```

## 11.15 Checklist

- [x] A dependencia `liquibase-core` esta no projeto.
- [x] O master inclui o changeSet inicial.
- [x] Hibernate esta configurado com `ddl-auto=validate`.
- [x] Os testes usam o mesmo changelog.
- [ ] A aplicacao cria um PostgreSQL vazio com o perfil `dev`.
- [ ] A segunda execucao nao recria tabelas nem duplica dados.
- [x] Sei que changeSet executado nao deve ser editado.

## 11.16 Ponto de versionamento

```bash
./mvnw test
git add .
git commit -m "Aula 11: versiona banco de dados com Liquibase"
git tag -a aula-11-liquibase -m "Schema inicial versionado com Liquibase"
git push origin main --follow-tags
```
