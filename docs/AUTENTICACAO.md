# Autenticacao JWT e controle de acesso

Implementacao baseada nas aulas [13](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-13-LOGIN-COM-JWT.md),
[14](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-14-CONTROLE-DE-ACESSO.md) e
[15](https://github.com/jeffersonarpasserini/suporteos2025/blob/main/docs/aulas/AULA-15-TESTES-E-COBERTURA.md).
O email existente representa o username, e os IDs continuam UUID. As rotas existentes foram preservadas.

## Matriz de acesso

| Operacao | Publico | USER | ADMIN |
|---|:---:|:---:|:---:|
| POST /auth/login | Sim | Sim | Sim |
| GET /auth/me | Nao | Sim | Sim |
| Consultar acoes, corretoras, carteiras e dashboard | Nao | Sim | Sim |
| Criar ou alterar dados de negocio, inclusive aportes, compras, vendas, transferencias e cotacoes | Nao | Nao | Sim |
| Gerenciar usuarios em /api/usuarios | Nao | Nao | Sim |
| POST /auth/register (contrato existente) | Nao | Nao | Sim |

O filtro exige autenticacao nas rotas da API. `@PreAuthorize` fica junto das operacoes
de escrita e na classe administrativa, como na aula. Os arquivos estaticos e as
rotas da tela de login sao publicos para permitir carregar o frontend.
O isolamento horizontal existente continua: cada identidade consulta apenas suas
acoes e sua carteira; o papel ADMIN nao concede acesso a carteiras de outros usuarios.

## Configuracao

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
5. Autentique a nova pessoa e consulte `GET /corretoras` (200). Tente
   `POST /carteiras/principal/aportes` com `{"valor":100}` e `GET /api/usuarios` (403).
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

A API usa `STATELESS`; nao persiste tokens nem cria sessao HTTP. Sair remove o
token do cliente. O endpoint existente `/auth/logout` apenas confirma a identidade
e retorna 204, sem revogar o token. Trocas de senha, papel e situacao nao revogam
JWTs ja emitidos; as authorities permanecem ate expirar, como nas aulas.
Nao foram acrescentados refresh token, recuperacao de senha, revogacao ou auditoria.

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
