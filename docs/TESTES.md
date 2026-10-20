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

## Estado inicial

Os portoes de 80% podem falhar enquanto a cobertura existente ainda estiver abaixo
da meta, mesmo quando todos os testes passarem. O relatorio indica onde acrescentar
testes. Nao reduza limites nem exclua codigo para obter uma aprovacao artificial.

## Integracao continua

O workflow `.github/workflows/tests.yml` executa as verificacoes em pushes e pull
requests, publica os relatorios e verifica a cobertura de linhas Java alteradas em PRs.
Tambem verifica as linhas alteradas do frontend a partir do relatorio LCOV.
O repositorio inclui um hook opcional em `.githooks/pre-commit`. Para ativa-lo localmente,
execute `git config core.hooksPath .githooks` na raiz do projeto. Com os portoes abaixo
de 80%, ele bloqueara commits; nao foi ativado automaticamente.

Para novas regras, use ciclos pequenos: teste que falha pelo motivo esperado, codigo
minimo para passar e refatoracao com os testes verdes. Para codigo ja existente, crie
testes de regressao antes de modifica-lo. Periodicamente, avalie testes de mutacao nos
modulos de maior risco; cobertura sozinha nao comprova a qualidade dos testes.

O arquivo `.github/CODEOWNERS` indica o responsavel pelas configuracoes. Exigir de fato
aprovacao de responsaveis e checks antes do merge depende de regras no GitHub; o arquivo
por si so nao bloqueia alteracoes.
