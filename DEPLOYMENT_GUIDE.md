# 🚀 Guia Completo de Deploy para Produção - Ranking DBV

Este guia orienta o processo de colocar o sistema **Ranking DBV** (Backend NestJS + Frontend React + Banco PostgreSQL) em produção na nuvem.

---

## 🏗️ 1. Arquitetura Sugerida (Custo-Benefício)

Para iniciar com estabilidade e baixo custo/grátis, sugerimos a seguinte stack:

*   **Banco de Dados (PostgreSQL):** [Supabase](https://supabase.com/) ou [Railway](https://railway.app/) (Plano Hobby).
*   **Backend (API NestJS):** [Railway](https://railway.app/) ou [Render](https://render.com/).
*   **Frontend (Web/PWA):** [Vercel](https://vercel.com/) (Melhor integração com React) ou Netlify.
*   **Imagens/Arquivos:** O Supabase já oferece Storage, ou utilize AWS S3.

---

## 🗄️ 2. Banco de Dados (PostgreSQL no Supabase)

1.  Crie uma conta no [Supabase](https://supabase.com/).
2.  Crie um novo projeto (ex: `rankingdbv-prod`).
3.  Vá em **Project Settings > Database** e copie a **Connection String** (URI).
    *   Exemplo: `postgresql://postgres:[SENHA]@db.xyz.supabase.co:5432/postgres`
    *   *Dica: Adicione `?pgbouncer=true` no final se usar serverless, mas para VPS/Railway direto não precisa.*

### Migração do Schema
No seu ambiente local (VS Code), atualize o `.env` do backend temporariamente ou rode o comando direto:

```bash
# Na pasta do backend
npx prisma db push --schema=./prisma/schema.prisma
# (Opcional) Se tiver dados locais importantes, você precisará exportar e importar via SQL.
```

---

## ⚙️ 3. Deploy do Backend (API)

Vamos usar o **Railway** (recomendado pela facilidade com Docker e variáveis).

1.  Crie conta no [Railway](https://railway.app/).
2.  Crie um **New Project** > **Deploy from GitHub repo**.
3.  Selecione o repositório do `rankingdbv-backend`.
4.  **Configuração de Variáveis (Variables):**
    Adicione as seguintes chaves (copie do seu `.env` local e ajuste para produção):
    *   `DATABASE_URL`: (A string de conexão do Supabase passo 2)
    *   `JWT_SECRET`: (Gere uma senha forte e longa)
    *   `PORT`: `3000` (ou `8080`, o Railway injeta automaticamente, mas deixe 3000 no código)
    *   `FRONTEND_URL`: `https://rankingdbv.vercel.app` (Colocaremos a URL real do front depois)
    *   `CORS_ORIGIN`: `*` (ou a URL do front para segurança)

5.  **Build Command:** O Railway detecta `package.json`. Certifique-se que o comando de start está correto:
    *   `npm run build` e depois `npm run start:prod`.

6.  **Gerar URL:** Vá em **Settings > Networking** no Railway e clique em "Generate Domain".
    *   Copie essa URL (ex: `https://rankingdbv-backend-production.up.railway.app`).

---

## 🖥️ 4. Deploy do Frontend (Web)

Vamos usar a **Vercel**.

1.  Crie conta na [Vercel](https://vercel.com/).
2.  Clique em **Add New > Project**.
3.  Importe o repositório do `rankingdbv-web`.
4.  **Build Settings:**
    *   Framework Preset: **Vite**
    *   Root Directory: `rankingdbv-web` (se estiver em monorepo, senão deixe raiz).
5.  **Environment Variables:**
    *   `VITE_API_URL`: Cole a URL do Backend gerada no passo 3 (ex: `https://rankingdbv-backend-production.up.railway.app`).
    *   *Nota: Não coloque a barra `/` no final se o seu código adiciona.*
6.  Clique em **Deploy**.

Após finalizar, você terá a URL oficial (ex: `https://rankingdbv.vercel.app`).
**Volte no Backend (Railway)** e atualize a variável `FRONTEND_URL` com esse link oficial.

---

## 📱 5. Gerar APK para Produção

Agora que o backend está online, você deve gerar o APK apontando para ele, não para o localhost.

1.  No arquivo `.env` do Frontend (ou direto no código `src/lib/axios.ts` se estiver hardcoded), aponte para a URL de produção.
    *   No arquivo `src/lib/axios.ts`, garanta que ele lê `import.meta.env.VITE_API_URL`.
2.  Gere o build Web novamente:
    ```bash
    npm run build
    npx cap sync
    ```
3.  Abra o Android Studio:
    ```bash
    npx cap open android
    ```
4.  Gere o **Signed APK** (ou Bundle `.aab` para Google Play):
    *   Menu **Build > Generate Signed Bundle / APK**.
    *   Crie uma chave (KeyStore) e guarde-a em local seguro (se perder, não atualiza mais o app na loja).

---

## ✅ Checklist Final

1.  [ ] **Banco de Dados:** Tabelas criadas no Supabase/Prod.
2.  [ ] **Backend:** Rodando sem erros de conexão no Railway. Logs estão limpos?
3.  [ ] **Frontend:** Acessível via URL Vercel. Login funciona?
4.  [ ] **Imagens:** Uploads estão funcionando? (Se usar disco local no Railway, os arquivos somem a cada deploy. Configure o S3 ou Supabase Storage no backend).
5.  [ ] **Cron Jobs:** Se tiver rotinas agendadas, o backend precisa ficar sempre ligado (evite plano gratuito que "dorme").

---

## 🆘 Suporte

Se houver erros de **CORS**, verifique e variável `CORS_ORIGIN` no Backend.
Se houver erro de **Conexão com Banco**, verifique se o IP do Railway é permitido no Supabase (geralmente "Allow all" `0.0.0.0/0` para conexões externas resolve).
