# Matriz de conformidade

Atualizado em 11/08/2026.

| Requisito | Implementacao |
|---|---|
| RF01 e RN01 | CNPJ normalizado, validado por digitos verificadores e consultado na Brasil API. |
| RF02 | Dados empresariais preenchidos exclusivamente pela fonte externa. |
| RF03 e RN03 | Indicador `validadaNaCvm` calculado por dados publicos equivalentes: situacao, CNAE e denominacao. Corretoras nao validadas sao persistidas e bloqueadas no cadastro de acoes. |
| RF04 e RN04 | CEP consultado no ViaCEP; falha ou CEP inexistente impede a persistencia. |
| RF05 e RF06 | Listagem e busca por ID/CNPJ em `/corretoras`. |
| RF07 e RN05/RN06 | Ticker validado por cotacao externa, com brapi para BR e Alpha Vantage para US. A acao forma um catalogo global. |
| RF08 | Nome, moeda, cotacao e data/hora sao preenchidos pela resposta de cotacao. |
| RF09 e RF10 | Listagem e busca por ID/ticker em `/acoes`. |
| RF11 | Atualizacao de cotacao em `PUT /acoes/{id}/atualizar-cotacao`. |
| RF12 e RN07 | CNPJ e ticker possuem verificacao no servico e restricao unica no banco. Varias carteiras podem possuir posicoes do mesmo ticker sem duplicar o ativo. |
| Camadas e DTOs | Controllers usam DTOs de entrada/saida; regras ficam em services e persistencia em repositories. |
| Bancos | H2 no perfil `test`, PostgreSQL em `dev` e MySQL em `mysql`. |
| Erros | Um unico `GlobalExceptionHandler` gera respostas JSON padronizadas. |
| Integracoes | Brasil API, ViaCEP, brapi e Alpha Vantage, isoladas por portas/adapters e clientes Feign. |
| Diferenciais | Cache de CNPJ/CEP, logs, testes, frontend separado, carteira, posicoes por usuario e perfis de usuario. |

## Cenarios de falha cobertos

- CNPJ invalido, inexistente ou repetido.
- CEP ausente ou nao validado.
- Corretora pendente bloqueada para novas acoes.
- Ticker inexistente, repetido ou com mercado invalido.
- APIs externas indisponiveis, com limite de requisicoes ou credencial ausente.
- Operacoes de escrita por usuario sem permissao.
- Compra acima do saldo disponivel ou venda acima da quantidade da propria carteira.
