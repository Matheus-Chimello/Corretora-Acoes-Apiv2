# Testes e cobertura

O backend usa JUnit, Mockito e JaCoCo. O frontend usa Vitest e Testing Library.
O perfil `test` utiliza um banco H2 em memoria e nao deve apontar para dados de desenvolvimento.

## Backend no Windows

```powershell
$env:SPRING_PROFILES_ACTIVE = 'test'
.\mvnw.cmd test
.\mvnw.cmd verify
```

O primeiro comando executa os testes. O segundo tambem gera `target/site/jacoco/index.html`
e exige pelo menos 80% de linhas e 80% de ramificacoes no conjunto do backend.

## Frontend

Em `src/main/front`:

```powershell
npm ci
npm test
npm run test:coverage
npm run build
```

O relatorio fica em `src/main/front/coverage/index.html`. A verificacao de cobertura
exige 80% de linhas, ramificacoes, funcoes e instrucoes no frontend.

## Politica de cobertura

Os portoes de 80% falham quando a cobertura estiver abaixo da meta, mesmo quando
todos os testes passarem. O relatorio indica onde acrescentar testes.
Nao reduza limites nem exclua codigo para obter uma aprovacao artificial.

## Integracao continua

O workflow `.github/workflows/tests.yml` executa as verificacoes em pushes e pull
requests, publica os relatorios e verifica a cobertura de linhas Java alteradas em PRs.
Tambem verifica as linhas alteradas do frontend a partir do relatorio LCOV.
O hook `.githooks/pre-commit` esta ativado neste checkout com `core.hooksPath=.githooks`.
Ele verifica as skills fixadas, executa o backend com perfil `test` e exige cobertura
do frontend. Em novos clones, execute `git config core.hooksPath .githooks` na raiz.
Para exercitar o hook sem criar commit, use `git hook run pre-commit`.
O modo executavel e os finais de linha LF estao definidos para uso em outros sistemas.

Para novas regras, use ciclos pequenos: teste que falha pelo motivo esperado, codigo
minimo para passar e refatoracao com os testes verdes. Para codigo ja existente, crie
testes de regressao antes de modifica-lo. Periodicamente, avalie testes de mutacao nos
modulos de maior risco; cobertura sozinha nao comprova a qualidade dos testes.

O arquivo `.github/CODEOWNERS` indica o responsavel pelas configuracoes. Exigir de fato
aprovacao de responsaveis e checks antes do merge depende de regras no GitHub; o arquivo
por si so nao bloqueia alteracoes.

## Autenticacao e autorizacao (aulas 13 a 15)

Os testes de seguranca usam JWT real, H2 e Liquibase no perfil `test`, sem usuarios
ou senhas reais. Cada teste de integracao prepara seus dados e reverte a transacao.
`@WithMockUser` isola os cenarios de autorizacao administrativa; os cenarios de
autenticacao passam pelo login, encoder, decoder e filtros reais.

Para executar apenas estes cenarios no Windows:

```powershell
$env:SPRING_PROFILES_ACTIVE = 'test'
.\mvnw.cmd '-Dtest=SegurancaIntegrationTest,AutenticacaoServiceTest,UsuarioServiceTest,JwtPropertiesTest,AdminInitializerTest' test
```

A suite cobre assinatura, emissor, expiracao, credenciais invalidas, conta inativa,
consultas de USER, escrita de ADMIN, erros 401/403, isolamento entre usuarios,
DTOs sem hash, email duplicado, preservacao do proprio email na alteracao,
troca de senha e limites de 7, 8, 72 e 73 caracteres.

Os ciclos TDD e o roteiro manual estao em [AUTENTICACAO.md](AUTENTICACAO.md).
O frontend verifica o envio do Bearer Token, cadastro restrito e saida local.
Os portoes de cobertura permanecem em 80%, sem exclusoes adicionais.

Resultado verificado em 27/10/2026:

| Verificacao | Resultado | Linhas | Ramos |
|---|---|---:|---:|
| `mvnw.cmd verify` (perfil `test`) | 118 testes aprovados | 91,47% | 81,17% |
| `npm run test:coverage` | 58 testes aprovados | 94,21% | 81,59% |
| `npm run build` | Aprovado | - | - |

A inversao temporaria da regra de email duplicado foi detectada por tres cenarios.
A condicao correta foi restaurada e o `verify` completo passou em seguida.

## Modulo 3: TDD e cobertura com agentes

As skills `tdd`, `codebase-design` e `code-review` foram copiadas para `.agents/skills`
do commit `c55ee46` de `mattpocock/skills`, a mesma versao analisada pelo modulo.
`skills-lock.json` registra origem, referencia e SHA-256 dos arquivos; o hash de
`tdd` corresponde ao exemplo do material. `node scripts/verify_skills_lock.mjs`
confere as copias. A skill local `coverage-gate` concentra as regras deste projeto,
sem editar as skills de terceiros. Elas ficam disponiveis para os agentes em novas sessoes/turnos.

Os testes de rotas agora usam controllers, servicos, filtros, serializacao, Liquibase
e H2 reais. So as portas das fontes externas sao substituidas. Os testes financeiros
usam `AcaoService` real; os repositorios e a cotacao representam fronteiras externas.
Nas telas, login, roteamento, componentes e servicos sao reais; os testes controlam
`fetch`, armazenamento e eventos do navegador. O unico mock de modulo no frontend
e a biblioteca externa de graficos em seus testes de dados. Os cenarios existentes
foram preservados.

### Protecao do portao

Com Python 3.12+, Node 22 e as dependencias do frontend instaladas:

```powershell
python -m unittest discover -s scripts/tests -v
python scripts/check_coverage_policy.py
python scripts/check_coverage_policy.py --base-ref origin/main
node scripts/verify_skills_lock.mjs
```

O verificador carrega os limites reais do JaCoCo e Vitest, exige todas as metricas
existentes em pelo menos 80% e compara com a referencia indicada. Recusa reducoes
mesmo acima de 80%, `skip` no JaCoCo, exclusoes novas e estreitamento dos arquivos
medidos. Nove testes de processo verificam essas rejeicoes com arquivos e repositorios
Git temporarios. O job `coverage-policy` roda antes dos jobs de backend/frontend;
nos PRs, usa o SHA da branch de destino para comparar a configuracao.

O CODEOWNERS cobre tambem skills, lock, scripts, hooks, ruleset, configuracao Git
e testes. A exigencia remota de aprovacao e checks depende de uma regra ativa no GitHub;
consulte [CONFIGURACAO-GITHUB.md](CONFIGURACAO-GITHUB.md).

### Mutacao periodica

```powershell
$env:SPRING_PROFILES_ACTIVE = 'test'
.\mvnw.cmd -Pmutation test-compile org.pitest:pitest-maven:mutationCoverage
```

O PIT e o plugin JUnit 5 mutam usuarios, autenticacao, carteira e propriedades JWT.
O perfil `mutation` e separado do `verify` comum: mutacao nao roda em cada commit.
`.github/workflows/mutation.yml` agenda a execucao nas segundas-feiras as 06:00 UTC
(03:00 em America/Sao_Paulo), permite disparo manual e publica HTML/XML de
`target/pit-reports/`. O agendamento entra em vigor quando o workflow estiver na
branch padrao do GitHub. A mutacao produz diagnostico; nao foi inventado um limite
de escore de mutacao alem dos limites de linhas e ramos exigidos pelo material.

### Validacao em 28/10/2026

| Verificacao | Resultado | Linhas | Ramos |
|---|---|---:|---:|
| `mvnw.cmd verify` (perfil `test`) | 119 testes aprovados | 92,26% | 81,82% |
| `npm run test:coverage` | 58 testes aprovados | 94,21% | 82,34% |
| Verificador da politica | 9 testes aprovados e comparacao com `HEAD` aprovada | - | - |
| Integridade das skills | 3 copias verificadas; skill local validada | - | - |
| PIT | 149 mutantes: 100 detectados, 23 sobreviventes, 26 sem cobertura | - | - |

O escore inicial de mutacao e 67,11% (100/149); a forca dos testes nos mutantes cobertos
e 81,30% (100/123). Esses valores nao substituem a cobertura global JaCoCo.
Os sobreviventes e trechos sem cobertura continuam expostos no relatorio para
orientar ciclos futuros, sem exclusoes artificiais.

`MigracaoJwtLegadaIntegrationTest` prepara um H2 isolado com o changelog anterior
ao JWT e a coluna `ativo` preexistente. A aplicacao deve iniciar e a API de usuarios
deve manter a conta legada inativa. O teste reproduziu o conflito encontrado na
atualizacao do Docker antes da correcao; os logs locais estao em
`target/tdd-docker-migracao-red.log` e `target/tdd-docker-migracao-green.log`.
