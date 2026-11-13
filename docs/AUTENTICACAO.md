# Autenticacao JWT e controle de acesso

Implementacao baseada nas aulas [13](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-13-LOGIN-COM-JWT.md),
[14](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-14-CONTROLE-DE-ACESSO.md) e
[15](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-15-TESTES-E-COBERTURA.md).
O email existente representa o username, e os IDs continuam UUID. As rotas existentes foram preservadas.

## Matriz de acesso

| Operacao | Publico | USER | ADMIN |
|---|:---:|:---:|:---:|
| POST /auth/login | Sim | Sim | Sim |
| GET /api/mercado/cotacoes (indicadores publicos) | Sim | Sim | Sim |
| GET /auth/me | Nao | Sim | Sim |
| Consultar cotacoes, corretoras, carteira e historico | Nao | Sim | Sim |
| Adicionar acoes ao catalogo e registrar aportes, compras, vendas e transferencias | Nao | Na propria conta | Na propria conta |
| Atualizar cotacoes a partir do provedor | Nao | Na propria conta | Na propria conta |
| Cadastrar corretoras compartilhadas | Nao | Nao | Sim |
| Gerenciar usuarios em /api/usuarios | Nao | Nao | Sim |
| POST /auth/register (contrato existente) | Nao | Nao | Sim |

O filtro exige autenticacao nas rotas da API. `@PreAuthorize` fica junto das operacoes
de escrita e na classe administrativa, como na aula. Os arquivos estaticos e as
rotas da tela de login sao publicos para permitir carregar o frontend.
A matriz adapta a Aula 14 para que os usuarios operem a propria carteira. A API
identifica o titular pelo JWT e limita leituras e operacoes ao seu catalogo e carteira,
inclusive para ADMIN. Os endpoints existentes de ajuste direto de saldo e recalculo
avulso continuam restritos a ADMIN e a propria conta.

Ao validar o login, o backend tenta atualizar todas as cotacoes do catalogo da
conta (BR e US) e recalcula o saldo de acoes para ambos os perfis.
Cada acao e atualizada em sua propria transacao. Se o provedor falhar para alguma
delas, as demais atualizacoes sao preservadas, o login continua e a resposta informa
`cotacoesAtualizadas: false`. O painel avisa que foram mantidos os ultimos valores
disponiveis. Credenciais invalidas nao disparam a atualizacao.

O carrossel consulta cotacoes antes do login em `/api/mercado/cotacoes`, com PETR4,
VALE3, ITUB4 e MGLU3, sem IDs de contas, carteiras ou outros dados de usuarios.
Esses simbolos sao disponibilizados pelo [provedor existente](https://brapi.dev/docs/acoes).
A consulta publica tem cache HTTP de 30 segundos. Depois do login, o carrossel
carrega o catalogo atualizado da conta; contas sem acoes usam os indicadores publicos.
As consultas se repetem a cada 30 segundos e apos mudancas de sessao ou operacoes.
Respostas atrasadas de uma sessao anterior sao descartadas.

As telas apresentam mensagens de permissao insuficiente (403), sessao expirada
(401), indisponibilidade e falhas de conexao. Erros de validacao mostram a mensagem
e os campos retornados pela API; o corpo JSON e detalhes internos de erros 5xx nao
sao exibidos. Nos formularios de venda e transferencia, o aviso fica dentro do modal.

## Configuracao

### Painel administrativo

Ao entrar com uma conta ADMIN, o frontend abre **Administracao** em
`http://localhost:8082/#/admin/usuarios`. O painel permite buscar e filtrar contas,
cadastrar usuarios, editar nome/email/perfil, ativar/desativar contas e alterar senhas
com confirmacao. A situacao da conta e alterada na opcao **Editar**, em **Conta ativa**.
A alteracao de perfil e a inativacao exigem pelo menos um administrador ativo
apos a operacao.
O botao **Historico administrativo** mostra data, autor, alvo e resultado das
alteracoes de perfil, inativacoes e consultas de revalidacao de corretoras.
O menu lateral de ADMIN tem duas opcoes independentes: **Administracao** e
**Corretoras**. Em `/admin/corretoras`, o administrador cadastra por CNPJ e
consulta a lista completa. A acao **Revalidar** faz uma nova consulta a
BrasilAPI e registra a fonte, a data e o resultado. Uma falha na consulta
preserva o resultado anterior.
Para ADMIN, as rotas comuns de Visao geral, Carteira e Acoes redirecionam para
Administracao. O caminho `/corretoras` abre a area de corretoras do ADMIN.
USER usa o menu comum, onde **Corretoras** lista as instituicoes validadas.
Novas contas usam USER por padrao. Senhas existentes nunca sao carregadas na tela.
USER recebe uma mensagem de acesso restrito ao tentar abrir a URL administrativa;
a API continua validando todas as permissoes. Falhas aparecem no proprio formulario,
e uma operacao so e confirmada apos a resposta da API. Os dialogs suportam Escape
e navegacao com Tab, sem perder o foco para o fundo da pagina.

### Minha conta

Os dois perfis podem abrir **Minha conta** no rodape do menu lateral e alterar
a propria senha. A API valida a senha atual e salva a nova senha da conta autenticada.

### Ambiente

Copie `.env.example` para `.env` e configure `JWT_SECRET` (pelo menos 32 bytes),
`JWT_EXPIRATION` (padrao `60m`), `JWT_ISSUER`, `APP_ADMIN_USERNAME` (email) e
`APP_ADMIN_PASSWORD` (entre 8 e 72 caracteres). Gere a chave com `openssl rand -base64 32`.
Use valores diferentes em cada ambiente. O perfil `test` possui chave ficticia propria
e banco H2 em memoria; os testes criam seus proprios usuarios.

O perfil deve ser selecionado pelo ambiente (`SPRING_PROFILES_ACTIVE=dev` ou `test`).
O Spring nao carrega `.env` automaticamente na execucao direta: informe as variaveis
na configuracao da IDE ou no processo. O Docker Compose repassa as variaveis ao backend.
Somente o perfil `dev` cria o administrador inicial, e somente quando o email ainda
nao existe. Alterar a senha do ambiente depois disso nao altera a senha armazenada.

O Liquibase acrescenta `ativo` e remove o token de sessao em um novo changelog.
Se `ativo` ja existir no banco legado, a migracao preserva a coluna e seus valores.
Os changelogs anteriores nao foram modificados. Sessoes antigas exigem novo login.

## Teste manual equivalente ao Postman

1. `POST /auth/login`, JSON `{"email":"email-do-admin","password":"senha-do-ambiente"}`.
   A resposta contem `token`, `tipo: "Bearer"`, `expiresIn`, nome, email e papel.
2. Envie `Authorization: Bearer <token>` em `GET /auth/me` e `GET /corretoras`.
   O primeiro mostra `username` e `authorities`; ambos devem retornar 200.
3. Como ADMIN, envie `POST /api/usuarios` com
   `{"nome":"Pessoa","email":"pessoa@teste.local","password":"senha-de-teste","papel":"USER"}`.
   Espere 201; nenhuma resposta de usuario apresenta senha ou hash.
4. Consulte `GET /api/usuarios` ou `GET /api/usuarios/{id}` como ADMIN.
5. Autentique a nova pessoa, consulte `GET /corretoras` e registre um aporte com
   `POST /carteiras/principal/aportes` e `{"valor":100}` (ambos 200). Com o mesmo
   token, `POST /corretoras` e `GET /api/usuarios` devem retornar 403.
6. Como ADMIN, envie `PUT /api/usuarios/{id}` com
   `{"nome":"Pessoa","email":"pessoa@teste.local","papel":"USER","ativo":false}`.
   Um novo login dessa conta deve retornar 401.
7. `PUT /api/usuarios/{id}/senha`, JSON `{"password":"outra-senha-de-teste"}`,
   retorna 204. Para uma conta ativa, a senha antiga deixa de autenticar e a nova passa.
8. Sem token, com assinatura adulterada, token expirado ou emissor diferente,
   os recursos protegidos retornam 401. Para testar expiracao manualmente, use
   `JWT_EXPIRATION=10s`, emita um token e espere a validade e a tolerancia de relogio
   do validador do Spring antes de repetir a consulta.

401 indica autenticacao ausente ou invalida. 403 indica identidade autenticada
sem o papel necessario. As respostas seguem o formato JSON de erros do projeto.

## Limites da aula

JWT e assinado com HS256 e contem emissor, identidade, emissao, expiracao e
authorities. O payload e legivel em Base64: assinatura garante integridade,
mas nao sigilo. Senhas e chaves nunca devem entrar nele.

A API usa `STATELESS` e verifica a situacao da conta a cada requisicao com JWT.
Inativar uma conta ou alterar seu perfil invalida os tokens ja emitidos para ela.
O frontend descarta a sessao e volta ao login assim que recebe a rejeicao da API.
O proximo login usa o perfil atual e exige uma conta ativa.

No logout manual, o cliente descarta seu token localmente. O endpoint
`/auth/logout` confirma a identidade e retorna 204.

## Testes e cobertura

Consulte [TESTES.md](TESTES.md). JUnit, Mockito, MockMvc, Spring Security Test e
H2 verificam credenciais, JWT real, permissoes, administracao e isolamento.
Mocks de repositorios isolam regras de servicos; os testes de integracao usam
persistencia, filtros, encoder, decoder e serializacao reais.
Os limites existentes de 80% de linhas e ramos permanecem; a configuracao de
55% usada como piso transitorio no exemplo da Aula 15 nao substitui o AGENTS.md.

Evidencias dos ciclos TDD (logs locais em `target/`, ignorados pelo Git):

- JWT: `tdd-jwt-red.log` registrou token com uma parte quando eram esperadas tres.
- RBAC: `tdd-rbac-red.log` registrou 200 quando USER deveria receber 403;
  `tdd-rbac-green.log` confirmou a correcao.
- Usuarios: `tdd-usuarios-red.log` demonstra a ausencia da API administrativa;
  os testes seguintes verificam criacao, duplicidade, alteracao e senha.
- Duplicidade: `tdd-duplicidade-red.log` e `tdd-duplicidade-green.log` verificam
  a rejeicao antes de persistir. Alteracao cadastral e troca de senha tiveram
  suas falhas esperadas em `tdd-cadastro-red.log` e `tdd-senha-red.log`.
- Mutacao: `tdd-mutacao.log` registra a inversao temporaria da condicao que
  distingue o proprio email do email de outro usuario. Os testes devem detectar
  a alteracao; o codigo original e restaurado antes de `verify-final.log`.
- Frontend: `src/main/front/tdd-auth-red.log` e `tdd-auth-green.log` verificam
  retirada do cadastro publico e saida local, sem revogacao de JWT.
