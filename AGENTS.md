# Orientacoes para alteracoes

- Use ciclos pequenos de TDD para comportamentos novos: um teste, falha esperada,
  implementacao minima e refatoracao com os testes passando.
- Teste resultados observaveis, inclusive erros, limites e isolamento de usuarios.
- Utilize o perfil `test` e dados isolados; nao use credenciais reais nem banco de producao.
- Execute `mvnw verify` no backend e `npm run test:coverage` em `src/main/front`.
- Os limites de cobertura sao 80% em linhas e ramificacoes. Nao diminua limites,
  suprima testes ou exclua codigo apenas para fazer a verificacao passar.
- Se a cobertura estiver abaixo da meta, informe os resultados e as areas pendentes.
- Consulte `docs/TESTES.md` para os comandos e os relatorios.
- Apos concluir e validar alteracoes neste projeto, atualize a execucao local no
  Docker automaticamente: reconstrua as imagens afetadas, recrie os containers
  necessarios e confira a inicializacao e o acesso HTTP, sem pedir nova autorizacao.
- Preserve os dados e volumes do banco durante as atualizacoes do Docker.
