# Estacionamento

App web para **duas pessoas** dividirem o boleto mensal do estacionamento do trabalho em **rodízio**.

- Mostra de quem é a vez de pagar em cada mês.
- Permite lançar o boleto do mês com **linha digitável** e/ou **PDF**.
- Marca o boleto como pago e guarda o **histórico**.
- Deixa **compartilhar o boleto no WhatsApp** com um toque.

> **Não há envio automático de mensagem nem de e-mail.** O app não usa a API do WhatsApp e não manda
> notificações. O compartilhamento abre o WhatsApp (ou o seletor do celular) e quem toca em enviar é a pessoa.

---

## 1. Como funciona

### Rodízio

- Nos **Ajustes** ficam o **mês inicial** e o **pagador inicial**.
- O pagador de cada mês vem da **paridade de meses** desde o mês inicial: no mês inicial paga o pagador
  inicial; no seguinte, a outra pessoa; e assim por diante. Vale também para meses anteriores ao inicial.

### Pagador congelado

- Quando um boleto é lançado, o pagador do mês é gravado em `bills.payer_id` e **não muda mais sozinho**.
  Alterar o rodízio nos Ajustes só afeta **meses sem boleto**; os boletos já lançados mantêm o pagador.
- **Override por mês:** ao lançar (ou editar) um boleto é possível escolher quem paga, mesmo que seja diferente
  do rodízio. Nesse caso `bills.payer_override` fica `true`. Para um mês que **já tem boleto pendente**, a
  troca de vez é feita em **Ajustes > Troca de vez**; para um mês **sem boleto**, no campo "Quem paga" do
  formulário de lançamento.

### Papéis

- **Quem paga** é a pessoa de `bills.payer_id` daquele boleto.
- **Quem envia** é a outra pessoa: só ela vê o botão "Enviar no WhatsApp" (e "Abrir conversa"). O destinatário
  é o pagador do boleto. Quem paga não vê os botões de envio.

### Status do boleto

| Status | Regra |
|---|---|
| **Pago** | `status = 'paid'` (com data e quem marcou). |
| **Vencido** | Pendente e com vencimento **anterior a hoje** (calendário local do aparelho). |
| **Pendente** | Pendente e vencimento hoje ou depois. |

O mês de um boleto **não pode ser alterado** depois de lançado.

---

## 2. Arquitetura e segurança

- **Frontend:** React + Vite (TypeScript), publicado no **GitHub Pages**. As rotas usam `HashRouter` (o endereço
  tem `#/`), então não precisa de configuração de servidor.
- **Backend:** **Supabase** — Postgres (tabelas `members`, `settings`, `bills`), Auth (e-mail e senha) e
  Storage (bucket privado `boletos`).
- **Sem bibliotecas além de** `react`, `react-dom`, `react-router-dom` e `@supabase/supabase-js`. Sem analytics,
  sem fontes externas, sem scripts de terceiros.

### Por que o repositório pode ser público

O Pages gratuito exige repositório público
([documentação do GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site);
a regra pode mudar, confira). Isso é seguro aqui porque:

- A **URL do projeto e a chave pública (anon/publishable) vão para o navegador de qualquer jeito**; não são segredo.
- A proteção real está no banco: **RLS** ligada em todas as tabelas e **grants por coluna**
  (`supabase/migrations/0002_rls.sql`). O papel `anon` não lê nem grava nenhuma tabela; só membros autenticados
  (`is_member()`) acessam. Não há `DELETE` para ninguém, e `bills.month` não tem grant de `UPDATE`.
- O bucket `boletos` é **privado**: os PDFs só abrem por **URL assinada** (10 minutos) ou por download
  autenticado de um membro.

### O que NUNCA entra no repositório

`.env`, a chave **`service_role`**, chaves **`sb_secret_…`**, telefones, e-mails, boletos e PDFs. O `.gitignore`
já ignora `.env*` (exceto `.env.example`), `dist`, `node_modules` e `*.tsbuildinfo`. O arquivo de cadastro
`supabase/seed.example.sql` só tem **placeholders**: copie-o para fora do repositório antes de preencher.

### A única exceção para `anon`: `ping()`

`supabase/migrations/0004_ping.sql` cria `public.ping()`, liberada para `anon`. É uma exceção **deliberada** à
regra "nada para anon", usada só pelo keep-alive (seção 6). Ela devolve sempre `true`, não recebe parâmetros, não
lê nem grava tabela alguma e roda como `security invoker`. Quem tem a chave pública pode chamá-la, e o único efeito
é uma consulta trivial. O Supabase pode listá-la num aviso de "função executável por anon": é esperado.

### Outras proteções

- `index.html` tem `noindex, nofollow` (o app não deve ser indexado).
- O CI tem uma **guarda de segurança** (seção 4).

---

## 3. Instalação do zero

Pré-requisitos: conta no [Supabase](https://supabase.com) e **Node 24** (a mesma versão do CI) com npm.

1. **Crie o projeto no Supabase.** Anote a URL do projeto e a chave pública (Project Settings > API: a
   *publishable* ou a *anon*). **Nunca** use a `service_role` nem a `sb_secret_…` no app.
2. **Rode as migrations no SQL Editor, nesta ordem:**
   1. `supabase/migrations/0001_schema.sql` (tabelas)
   2. `supabase/migrations/0002_rls.sql` (RLS e grants)
   3. `supabase/migrations/0003_storage.sql` (bucket privado e policies)
   4. `supabase/migrations/0004_ping.sql` (função do keep-alive)
3. **Crie os dois usuários** em *Authentication > Users*, com **"Auto Confirm User"** marcado. Depois **desative
   "Allow new users to sign up"** (nas configurações de login/providers do Auth; o nome do menu pode variar),
   para ninguém mais criar conta com a chave pública.
4. **Cadastre `members` e `settings`.** Copie `supabase/seed.example.sql` **para fora do repositório**, troque
   cada `<PLACEHOLDER>` (os ids são o *User UID* de cada usuário) e rode no SQL Editor. **Nunca faça commit do
   arquivo preenchido.** O bloco 3 do modelo (boleto de teste) é opcional.
5. **Confira o acesso** (opcional): rode os blocos de `supabase/verify.sql` no SQL Editor, na ordem descrita no
   cabeçalho do arquivo.
6. **Senhas vazadas:** se o seu plano permitir, ligue a proteção contra senhas vazadas em *Authentication*. Hoje a
   [documentação](https://supabase.com/docs/guides/auth/password-security) diz que está disponível a partir do
   plano Pro; confira a regra atual.
7. **Variáveis locais:** copie `.env.example` para `.env` e preencha `VITE_SUPABASE_URL` e
   `VITE_SUPABASE_ANON_KEY` (só a chave pública).
8. **Rode:**

```bash
npm install
npm run dev      # desenvolvimento
npm test         # testes (Vitest)
npm run build    # typecheck (tsc -b) + build de produção em dist/
```

O compartilhamento de PDF pelo celular **não funciona no `localhost` do computador** (exige HTTPS e o navegador
do celular); teste com o app publicado.

---

## 4. Publicação (GitHub Pages)

O workflow `.github/workflows/deploy.yml` publica a cada push na branch `main` (ou manualmente).

1. Repositório **público** no GitHub (o nome vira parte do endereço do app).
2. **Settings > Pages > Build and deployment > Source = GitHub Actions.**
3. **Settings > Secrets and variables > Actions > aba _Variables_** (não *Secrets*): crie
   - `VITE_SUPABASE_URL`: a URL do projeto, `https://<ref-do-projeto>.supabase.co`;
   - `VITE_SUPABASE_ANON_KEY`: a chave **pública** (publishable ou anon). **Nunca** `service_role` nem `sb_secret_…`.
4. Faça push em `main`. Acompanhe na aba **Actions**. O app fica em
   `https://<seu-usuario>.github.io/<nome-do-repositorio>/`.

O `VITE_BASE_PATH` é definido pelo workflow (`/<nome-do-repositorio>/`); o fallback do `vite.config.ts` é
`/estacionamento/`.

### O que o workflow faz

`npm ci` → verifica que as duas variáveis existem → `tsc -b` → `npm test` → `npm run build` → **guarda de
segurança** → publica `dist/`. As actions usadas são oficiais (`actions/*`) e fixadas por SHA.

### A guarda de segurança (por que o deploy pode ficar vermelho)

Depois do build, o job **falha** se encontrar:

- texto de chave de serviço ou secreta do Supabase no repositório;
- no `dist/`, texto de chave de serviço, uma chave secreta com formato de chave de verdade, ou **qualquer JWT cujo
  papel não seja `anon`** (uma chave de serviço é um JWT cujo papel só aparece em base64);
- um arquivo `.env` (exceto `.env.example`);
- e, numa etapa anterior, uma variável ausente ou uma chave que não seja a pública.

Se ficar vermelho, leia a mensagem `::error::` do passo que falhou, corrija (a variável ou o arquivo) e rode de novo.

### Rodar o deploy de novo

Aba **Actions > Deploy (GitHub Pages) > Run workflow**, ou qualquer push em `main`.

---

## 5. Operação do dia a dia

- **Trocar a senha:** *Ajustes > Alterar senha*. **Se perder a senha:** o app não tem tela de "esqueci minha
  senha"; redefina pelo painel do Supabase (*Authentication > Users*; confira as opções disponíveis no painel).
- **Trocar o telefone ou o nome:** *Ajustes > Conta*. Cada pessoa pode editar os dois membros. Telefone só com
  dígitos, de 10 a 15, com DDI e DDD (ex.: `5511999999999`); a máscara na digitação é aceita e só os dígitos são
  gravados. Vazio apaga o telefone.
- **Mudar o rodízio:** *Ajustes > Rodízio*. Só afeta meses **sem boleto**.
- **Trocar a vez de um mês com boleto pendente ou vencido:** *Ajustes > Troca de vez*. Boleto pago não aparece
  (veja as limitações).
- **Corrigir um boleto:** *Histórico > tocar no mês* (ou *Editar boleto* no Início). O mês fica travado. Trocar o
  PDF remove o antigo só depois de a gravação dar certo. É preciso manter **a linha digitável ou o PDF**.
- **Apagar um boleto:** o app **nunca apaga**. Só pelo painel do Supabase:
  1. Anote o `id` do boleto e o `attachment_path` (`<id>/<arquivo>.pdf`) no *Table Editor*.
  2. Apague o PDF em *Storage > boletos* pelo painel (ou pela API de Storage). **Não apague pela SQL**: a
     [documentação](https://supabase.com/docs/guides/storage/management/delete-objects) avisa que apagar linhas
     de `storage.objects` por SQL deixa o arquivo órfão no bucket.
  3. Apague a linha de `bills` no *Table Editor*.
- **Trocar uma das duas pessoas:** o app tem sempre **exatamente dois** membros (o rodízio só existe com dois).
  Para outra pessoa assumir o lugar de uma e **manter o histórico**, mantenha o mesmo usuário e a mesma linha de
  `members` (o `id` é o mesmo do usuário do Auth): troque o e-mail do usuário em *Authentication > Users*, atualize
  `name`, `email` e `phone` da linha em `members` (SQL Editor) e redefina a senha. As chaves estrangeiras impedem
  apagar um membro que tem boletos. Adicionar um terceiro membro **não é suportado**.

---

## 6. Keep-alive

Projetos gratuitos do Supabase podem ser pausados por inatividade. O workflow
`.github/workflows/keep-alive.yml` roda **terças e sextas às 09:17 UTC** (e manualmente) e chama
`POST <URL>/rest/v1/rpc/ping` com a chave pública. Ele falha se a resposta não for `true`, tentando até 4 vezes, e
nunca imprime a chave. Usa as mesmas variáveis de repositório do deploy.

Avisos importantes:

- **(a) O GitHub desativa workflows agendados após 60 dias sem atividade no repositório** (em repositórios
  públicos; [documentação](https://docs.github.com/en/actions/managing-workflow-runs-and-deployments/managing-workflow-runs/disabling-and-enabling-a-workflow)).
  O keep-alive pode **parar sozinho**. Para reativar: *Actions > Keep-alive (Supabase) > Enable workflow*. Um push
  em `main` reinicia a contagem de atividade.
- **(b) Pausa do projeto:** o Supabase pode avisar por e-mail antes de pausar um projeto inativo. Para restaurar,
  use o painel do projeto ([documentação](https://supabase.com/docs/guides/platform/free-project-pausing); a
  janela de restauração e os critérios podem mudar, confira).
- **(c) Não há garantia.** A documentação fala em "atividade de banco do usuário" na última semana, sem detalhar o
  que conta. O `ping()` é uma consulta real ao Postgres, mas **não é garantia** de que a pausa não ocorra, e a
  regra do plano pode mudar. Usar o app também gera atividade.
- Se o workflow ficar vermelho: projeto pausado, ou a função `ping()` ausente (migration 0004 não aplicada).
  O GitHub costuma notificar falhas de workflow, conforme as suas preferências de notificação.

---

## 7. Backup e recuperação

**Não trate o plano gratuito como backup garantido.** A
[documentação de backups](https://supabase.com/docs/guides/platform/backups) recomenda que projetos gratuitos
exportem os dados regularmente (por exemplo com o comando `supabase db dump` da CLI) e mantenham cópias fora do
Supabase. Ela também diz que os backups do banco **não incluem os arquivos do Storage**, só os metadados.

Recomendação: **exporte de tempos em tempos.**

- **Tabelas `bills` e `members`:** no *Table Editor* do painel (há exportação para CSV; confira na sua versão do
  painel) ou por SQL/CLI (`supabase db dump`).
- **PDFs:** baixe do *Storage > boletos* pelo painel. Cada arquivo fica em `<id-do-boleto>/<numero>.pdf`.
- **Recriar do zero:** crie um projeto novo, rode as migrations 0001 a 0004, recrie os usuários e o cadastro
  (`seed.example.sql`), importe `bills` e envie os PDFs de volta **com os mesmos caminhos** (o campo
  `attachment_path` aponta para eles). Atualize as variáveis do GitHub com a URL e a chave do projeto novo.

---

## 8. Problemas comuns

| Sintoma | Causa provável e o que fazer |
|---|---|
| **"Este e-mail não tem acesso ao app."** | O usuário existe no Auth, mas não há linha em `members` com o **mesmo id** (*User UID*). Confira o cadastro. |
| **"E-mail ou senha incorretos."** | Usuário inexistente, e-mail diferente ou senha errada. |
| **"Invalid API key"** (no console ou na API) | Chave copiada errada. Atenção a **L minúsculo** e **I maiúsculo**, que se parecem. Recopie e atualize a variável. |
| **Tela "Configuração incompleta"** | Faltam `VITE_SUPABASE_URL` e/ou `VITE_SUPABASE_ANON_KEY` (no `.env` local ou nas variáveis do repositório). |
| **"PDF não encontrado"** | O arquivo foi apagado do Storage ou o caminho não existe mais. Edite o boleto e anexe o PDF de novo. |
| **Compartilhar PDF não funciona** | Só funciona **no celular e em HTTPS** (app publicado). No computador aparece só "Abrir conversa". |
| **Deploy vermelho** | A guarda de segurança falhou, ou falta uma variável (seção 4). Leia a mensagem do passo. |
| **Keep-alive vermelho** | Projeto pausado, ou a função `ping()` não existe (rode a migration 0004). |

---

## 9. Limitações conhecidas

- **Pagador congelado:** mudar o rodízio não altera boletos já lançados; para isso existe a troca de vez.
- **"Boleto pago não troca de pagador" é só de interface.** O banco **aceita** a troca (o grant de `UPDATE` em
  `bills.payer_id` não distingue); quem tiver acesso ao banco pode alterar.
- **O WhatsApp pode descartar o texto** quando recebe um arquivo junto, dependendo do aparelho. O código da linha
  digitável continua disponível no app.
- **"Compartilhado em …"** significa que o compartilhamento foi **aberto**, não que a mensagem foi enviada. O app
  não tem como saber.
- **Suporte do navegador:** o compartilhamento de arquivo depende de `navigator.share` com arquivos
  (em geral, Chrome no Android e Safari no iOS; navegadores de computador costumam não oferecer).
- **Sem notificações** nem lembretes: o app só mostra a situação quando é aberto.
- **Sem recuperação de senha pelo app** e **sem terceiro membro**.
- **Depende de duas pessoas de confiança:** ambas podem editar o cadastro uma da outra, lançar, editar e trocar o
  pagador de boletos pendentes.

---

## Estrutura

```
src/lib/        regras puras e acesso a dados (rotation, bills, share, settingsRules, queries…)
src/pages/      Início, Lançar/editar boleto, Histórico, Ajustes, Login
src/components/ blocos de tela (BarcodeBlock, ShareBlock, PdfButton…)
src/tests/      testes (Vitest) das regras puras
supabase/       migrations 0001–0004, seed.example.sql (modelo) e verify.sql (conferência de acesso)
.github/        workflows de deploy e keep-alive
```
