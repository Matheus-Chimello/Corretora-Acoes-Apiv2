# Exigir a politica no GitHub

O projeto inclui o ruleset importavel
[coverage-and-review.json](../.github/rulesets/coverage-and-review.json).
O arquivo preparado exige PR, uma aprovacao humana, revisao do CODEOWNERS para os
arquivos protegidos e os checks `coverage-policy`, `backend` e `frontend` aprovados
com a branch atualizada. Nao ha atores de bypass definidos.

Apenas adicionar CODEOWNERS e workflows ao Git nao ativa essas exigencias no servidor.
Em consulta publica de 28/10/2026, `main` de
`Matheus-Chimello/Corretora-Acoes-Apiv2` informou `protected: false`.
Nenhuma configuracao remota foi alterada nesta implementacao.

Depois de publicar os arquivos e executar o workflow pela primeira vez, um administrador
do repositorio deve abrir Settings > Rules > Rulesets, importar o JSON e confirmar
que a regra esta ativa na branch padrao. Confira os nomes dos checks apresentados
pelo GitHub e os responsaveis em CODEOWNERS antes de ativar. O autor de um PR precisa
de outro revisor habilitado para satisfazer a aprovacao exigida.

Para outro remoto, como `Os-Tops/Corretora-Acoes-Apiv2`, aplique a regra no repositorio
correto e confira as permissoes dos code owners. A configuracao local nao altera o grupo.

Referencias oficiais: [API de rulesets](https://docs.github.com/en/rest/repos/rules#create-a-repository-ruleset)
e [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners).
