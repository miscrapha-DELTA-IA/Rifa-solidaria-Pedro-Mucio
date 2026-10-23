# Rifa Solidária — Pedro Múcio

Site estático para a rifa de **200 números, R$ 20 por número**, com obra de **Ilton Silva** como prêmio e contribuição para os torneios internacionais de debate em 2027. Hospedagem no Netlify, código no GitHub, dados no Supabase.

## Ativar Supabase

1. Crie um projeto em https://supabase.com/dashboard.
2. Abra **SQL Editor** e execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql). O comando cria a cartela de 001 a 200, permissões RLS e sincronização Realtime.
3. Em **Project Settings > API Keys** e **Project URL**, copie a URL e a **publishable key** (ou a chave pública `anon` de projetos antigos). Preencha apenas esses campos em [`config.js`](config.js). **Nunca** exponha `service_role`, chaves secretas ou senha de banco no GitHub.
4. Preencha `WHATSAPP_NUMBER` em `config.js` com DDI 55 + DDD + número do organizador, sem símbolos.
5. Em **Authentication > Users**, crie um usuário com e-mail e senha para o organizador. Copie seu **User UID**.
6. No **SQL Editor**, execute `insert into public.rifa_admins (user_id) values ('COLE_AQUI_O_UUID_DO_USUARIO') on conflict (user_id) do nothing;`. Esse usuário terá permissão para marcar/desmarcar vendas.
7. Se for usar confirmação por e-mail ou redefinição de senha, ajuste **Authentication > URL Configuration** com o endereço verdadeiro do Netlify.

**Não há uma senha de administrador no HTML**: as alterações são autorizadas pelo Supabase Auth + Row Level Security (RLS). A interface pública somente lê a cartela. O site fica com a grade bloqueada enquanto não houver conexão com o Supabase.

## Ligar o Netlify ao GitHub sem perder o endereço atual

Se o site já foi criado por **deploy manual**, abra o projeto existente no https://app.netlify.com, acesse **Project configuration → Developer settings → Continuous deployment → Repository → Link repository** (o nome do menu pode variar). Escolha GitHub e selecione `miscrapha-DELTA-IA/Rifa-solidaria-Pedro-Mucio`.

Use **branch `main`**, **Build command vazio**, **Publish directory `.`**. O `netlify.toml` já define a pasta de publicação como a raiz. Ao enviar novas alterações para `main`, o Netlify fará novos deploys automaticamente. **Não crie um segundo site**, para conservar o endereço `*.netlify.app` já divulgado.

## Como funciona a confirmação

A seleção de números no navegador e o encaminhamento para WhatsApp **não reservam nem bloqueiam automaticamente**. Somente o organizador, **após conferir pagamento e disponibilidade**, marca o número como vendido. Todos os visitantes verão a mudança em tempo real (com reconciliação a cada 30 segundos enquanto a página estiver ativa).

## Arquivos

- `index.html`: visual da página original, adaptado para autenticação segura.
- `app.js`: cartela, sincronização e fluxo WhatsApp.
- `config.js`: apenas parâmetros públicos, que precisam ser preenchidos.
- `obra.jpg`: imagem da obra. Se não estiver no GitHub, envie o arquivo para a raiz do repositório.
- `supabase/schema.sql`: tabelas, políticas RLS, Realtime e administrador.
- `netlify.toml`: publicação estática no Netlify.

### Checklist antes de divulgar

- [ ] URL e chave pública Supabase preenchidas em `config.js`.
- [ ] SQL executado sem erros.
- [ ] Conta organizadora criada e UUID cadastrado em `rifa_admins`.
- [ ] WhatsApp real preenchido e testado.
- [ ] `obra.jpg` presente no repositório e aparecendo no site.
- [ ] Site existente no Netlify vinculado ao GitHub.
- [ ] Teste em dois aparelhos: marcar número vendido no organizador e confirmar atualização no outro.
- [ ] Conferir regras legais aplicáveis à realização e divulgação da rifa antes de abrir vendas.