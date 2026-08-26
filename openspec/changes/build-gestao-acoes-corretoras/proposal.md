## Why

Este projeto deve entregar uma plataforma web para cadastro de corretoras, catalogo de acoes e gestao de carteira de investimentos. A solucao deve centralizar dados cadastrais, cotacoes e operacoes de compra/venda em uma API REST com interface web simples para investidores e administradores.

## What Changes

- Criar uma API backend em Spring Boot para autenticar usuarios, cadastrar corretoras, manter um catalogo global de acoes e gerenciar carteiras individuais.
- Criar persistencia relacional versionada por Liquibase, com suporte local a H2, PostgreSQL e MySQL.
- Integrar consultas externas para CNPJ, CEP e cotacoes de mercado.
- Criar frontend web em React/Vite para login, dashboard, corretoras, acoes e carteira.
- Padronizar respostas de erro para validacoes, regras de negocio, conflitos de integridade e falhas de APIs externas.
- Disponibilizar configuracao para execucao local e conteinerizada.

## Capabilities

### New Capabilities

- `platform/runtime-config`: Configuracao de execucao, perfis, variaveis de ambiente, cache, Feign, build e Docker.
- `platform/persistence-liquibase`: Modelo relacional, migrations Liquibase, constraints e carga inicial de demonstracao.
- `identity/session-auth`: Cadastro, login, logout, perfis de usuario e autenticacao por token de sessao.
- `brokers/broker-registry`: Cadastro, consulta e validacao cadastral de corretoras por CNPJ.
- `assets/asset-catalog`: Cadastro, consulta e atualizacao de acoes em catalogo global.
- `portfolio/wallet-and-positions`: Carteira principal, aportes, compra, venda, posicoes e saldos por usuario.
- `dashboard/investor-overview`: Indicadores consolidados, listagens resumidas e dados para graficos do painel.
- `integrations/company-validation`: Contrato e comportamento de consulta de CNPJ e identificacao de participantes do mercado.
- `integrations/address-validation`: Contrato e comportamento de validacao de CEP.
- `integrations/market-quotes`: Contrato e comportamento de cotacoes BR e US.
- `frontend/react-shell`: Shell React, roteamento, protecao de rotas, sessao local e navegacao.
- `frontend/investor-workflows`: Telas e fluxos de usuario para login, corretoras, acoes, carteira e dashboard.

### Modified Capabilities

- Nenhuma. O repositorio ainda nao possui specs base sob `openspec/specs`.

## Impact

- Backend: aplicacao Spring Boot, controllers REST, services, repositories, DTOs, entidades JPA, tratamento global de excecoes, perfis e configuracoes.
- Frontend: aplicacao React/Vite, rotas, componentes, paginas, servicos HTTP e armazenamento de sessao no navegador.
- Banco de dados: schema relacional, constraints de unicidade, relacionamentos e dados de demonstracao.
- Integracoes: Brasil API, ViaCEP, brapi e Alpha Vantage.
- Operacao: variaveis de ambiente, Maven, npm, Dockerfile e Docker Compose.
