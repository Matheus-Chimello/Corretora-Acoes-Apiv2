# 📌 API de Gestão de Ações e Corretoras

Este projeto consiste em uma aplicação para gestão de ações, corretoras e carteiras de investimento. A solução possui uma **API RESTful** desenvolvida em Java com Spring Boot e uma interface web para organizar ativos, acompanhar cotações e registrar movimentações financeiras.

A aplicação integra fontes externas para consultar dados de mercado e validar informações de corretoras, enriquecendo os cadastros locais e ajudando a manter a integridade das informações utilizadas na carteira.

> Projeto desenvolvido para fins acadêmicos e de organização pessoal. Não representa recomendação de investimento.

## 🎯 Objetivo

Construir uma solução de gestão de investimentos que permita:

- Cadastrar ações dos mercados brasileiro e americano.
- Consultar e atualizar cotações de ativos.
- Validar corretoras a partir do CNPJ.
- Controlar aportes, compras, vendas e transferências.
- Calcular preço médio, lucro ou prejuízo e composição da carteira.
- Manter o catálogo de ativos e a carteira separados por usuário.

---

## ✨ Funcionalidades

- Cadastro e atualização de ações.
- Catálogo individual de ativos para cada usuário.
- Cadastro de corretoras após validação das informações públicas.
- Consulta de cotações de ações brasileiras e americanas.
- Carteira com saldo disponível e controle de aportes.
- Compra e venda de ações com valor unitário e valor total.
- Cálculo de preço médio ponderado por ação e corretora.
- Transferência de posições entre corretoras.
- Histórico de aportes, compras, vendas e transferências.
- Indicadores de resultado por posição.
- Gráficos de composição e acompanhamento da carteira.
- Filtros para facilitar a consulta de tabelas e movimentações.

---

## ✅ APIs Utilizadas

### 1. [BRAPI](https://brapi.dev) - Cotações de ações

- **Descrição**: Serviço de dados financeiros com informações de mercado e cotações de ativos.
- **Uso no sistema**: Utilizado para consultar ações brasileiras e como fonte preferencial para cotações de ativos disponíveis na plataforma.

### 2. [Alpha Vantage](https://www.alphavantage.co) - Mercado americano

- **Descrição**: Plataforma de dados financeiros com informações de ações negociadas nos Estados Unidos.
- **Uso no sistema**: Utilizada como alternativa para consulta de cotações de ações americanas quando necessário.

### 3. [Brasil API](https://brasilapi.com.br) - Dados de CNPJ

- **Descrição**: API pública que disponibiliza dados brasileiros, incluindo informações cadastrais de empresas.
- **Uso no sistema**: Consultada para obter dados do CNPJ informado no cadastro de corretoras e apoiar a validação da instituição.

### 4. [ViaCEP](https://viacep.com.br) - Consulta de CEP

- **Descrição**: Serviço público para consulta de endereços brasileiros por CEP.
- **Uso no sistema**: Utilizado para validar e complementar os dados de endereço associados às corretoras.

---

## 🔄 Como Funciona

### Corretoras

1. O usuário informa o CNPJ.
2. A aplicação consulta os dados públicos da empresa.
3. O endereço é validado por meio do CEP.
4. A corretora só é cadastrada quando é identificada como participante válida do mercado.

### Ações e cotações

1. O usuário escolhe o mercado e informa o ticker.
2. A aplicação consulta a cotação em uma fonte externa.
3. A moeda retornada é validada conforme o mercado selecionado.
4. O ativo é salvo apenas no catálogo do usuário autenticado.
5. As cotações podem ser atualizadas individualmente ou em lote.

### Carteira

1. O usuário realiza aportes para formar o saldo disponível.
2. As compras registram ativo, corretora, quantidade e valor unitário.
3. O preço médio é atualizado de forma ponderada.
4. Vendas e transferências são registradas no histórico.
5. A interface apresenta posição atual, resultado e composição da carteira.

---

## ✅ Tecnologias e Ferramentas

- **Linguagem e backend**: Java e Spring Boot.
- **Frontend**: React e Vite.
- **Persistência**: PostgreSQL.
- **Testes**: H2 e JUnit.
- **Versionamento do banco**: Liquibase.
- **Comunicação externa**: Spring Cloud OpenFeign.
- **Containerização**: Docker e Docker Compose.
- **Gráficos**: Recharts.

---

## 🏗️ Organização do Projeto

O sistema é dividido em três partes principais:

- **Interface web**: apresenta o catálogo, as corretoras, a carteira, as tabelas, os gráficos e os formulários de operação.
- **API**: recebe as ações do usuário, aplica as regras de negócio, consulta os serviços externos e controla o acesso aos dados.
- **Banco de dados**: armazena usuários, corretoras, ativos, posições e histórico de movimentações.

A API segue uma organização em camadas. Os controllers recebem as requisições, os serviços executam as regras de negócio, os repositórios acessam os dados e as integrações externas ficam isoladas em adaptadores próprios.

---

## 🔐 Segurança e Configuração

- Cada usuário visualiza apenas o próprio catálogo de ações e a própria carteira.
- Uma conta nova começa com carteira e catálogo de ativos vazios.
- O acesso às funcionalidades é protegido por autenticação.
- As credenciais e chaves utilizadas pela aplicação permanecem protegidas e não fazem parte do código público.

---

## 🧪 Testes

O projeto possui testes automatizados para validar as regras mais importantes, como cadastro de ativos, validação de corretoras, compras, vendas, transferências, preço médio e separação dos dados por usuário.

---

## 📬 API

A API utiliza autenticação por token. Após o login, o usuário pode consultar e administrar apenas os dados relacionados à sua própria conta.

---

## 🤝 Contribuição

Contribuições são bem-vindas. Antes de enviar uma alteração:

1. Verifique se nenhuma informação sensível foi incluída.
2. Mantenha as alterações alinhadas às regras de negócio do projeto.
3. Preserve a separação dos dados entre os usuários.

---

## 📄 Licença

Projeto acadêmico desenvolvido para estudo e evolução de uma aplicação de gestão de investimentos.
