---
description: Planejamento para Gestão de Licenças e Pagamentos (Master)
---

# Planejamento: Gestão de Licenças e Pagamentos (Master)

Este documento detalha o plano de implementação para permitir que o usuário Master gerencie as licenças dos clubes, envie cobranças com chave PIX e valide pagamentos manualmente.

## 1. Visão Geral
O objetivo é fornecer ao Master ferramentas para controlar o fluxo financeiro do SaaS diretamente pelo painel administrativo. O Master poderá:
1.  Visualizar quais clubes estão em dia ou vencidos.
2.  Enviar notificações de cobrança contendo a chave PIX padrão.
3.  Renovar manualmente a assinatura de um clube após confirmar o recebimento (via comprovante externo).

## 2. Implementação Backend (`rankingdbv-backend`)

### A. Módulo `Clubs`
Precisaremos estender o `ClubsController` e `ClubsService` para suportar o envio de notificações específicas de cobrança. O método `updateSubscription` já existe e será reutilizado para a validação do pagamento.

#### Alterações Planejadas:
1.  **Novo Endpoint: Envio de Dados de Pagamento**
    *   **Rota:** `POST /clubs/:id/send-payment-info`
    *   **Corpo:** `{ message: string }` (Opcional, enviará mensagem padrão se vazio)
    *   **Lógica:**
        *   Busca o Dono (OWNER) ou Diretores (DIRECTOR) do clube.
        *   Usa o `NotificationsService.send()` para enviar uma notificação persistente.
        *   Título: "Renovação de Assinatura Ranking DBV".
        *   Mensagem: Contém o texto com a chave PIX.
        *   Tipo: `WARNING` ou `INFO`.

2.  **Reutilização de Endpoint: Validação Manual**
    *   O endpoint `PATCH /clubs/:id/subscription` já existe e permite alterar `subscriptionStatus`, `nextBillingDate`, `planTier` e `memberLimit`.
    *   Nenhuma alteração de código necessária aqui, apenas integração no Frontend.

## 3. Implementação Frontend (`rankingdbv-web`)

### A. Página de Hierarquia (`src/pages/Hierarchy.tsx`)
Esta página será renomeada e refatorada para **"Gestão de Clubes & Licenças"**.

#### Funcionalidades na Tabela de Clubes:
1.  **Coluna de Status Visual:** Já existe, será mantida (Ativo/Vencido/Vence em Breve).
2.  **Novos Botões de Ação na Tabela:**
    *   **"Enviar Cobrança" ($):**
        *   Abre um modal simples ou `confirm` customizado.
        *   Exibe a mensagem padrão com a chave PIX: `68323280282 Alex Oliveira Seabra`.
        *   Permite editar a mensagem antes de enviar.
        *   Ao confirmar, chama o endpoint `POST /clubs/:id/send-payment-info`.
    *   "Validar Pagamento" (Check):
        *   Abre o modal ClubSubscriptionModal (já existente).
        *   **Regra de Vencimento:** O sistema deve calcular o próximo vencimento respeitando o ciclo original, independente da data do pagamento.
            *   *Exemplo:* Se vence dia 30/01 e pagou dia 15/01, ou dia 15/02, o próximo vencimento será somado com base na data original de vencimento (ex: +30 dias ou +1 ano), resultando em 28/02 (ou data correta do ciclo), jamais "resetando" para o dia do pagamento.
        *   Define Status como ACTIVE.
        *   Salva.

### B. Componentes
*   **`SendPaymentModal` (Novo):**
    *   Textarea pré-preenchida com:
        > "Olá! Sua assinatura do Ranking DBV está vencendo. Para renovar, faça um PIX para a chave: 68323280282 (Alex Oliveira Seabra) e envie o comprovante."
    *   Botão "Enviar Notificação".

## 4. Fluxo de Trabalho do Usuário (Master)

**Cenário 1: Enviar Cobrança**
1.  Master acessa "Gestão de Clubes".
2.  Identifica clubes com status "Vence em Breve" (amarelo) ou "Vencido" (vermelho).
3.  Clica no ícone de **$ (Cifrão)**.
4.  Confirma a mensagem com a chave PIX.
5.  O Diretor do clube recebe uma notificação no sistema imediatamente.

**Cenário 2: Validar Pagamento**
1.  Master recebe o comprovante via WhatsApp/Email (externo).
2.  Master acessa "Gestão de Clubes".
3.  Localiza o clube.
4.  Clica em **Validar/Gerenciar**.
5.  No modal:
    *   Muda Status para `ACTIVE`.
    *   Adiciona +1 Ano na data de vencimento.
6.  Salva. O clube tem acesso liberado instantaneamente.
