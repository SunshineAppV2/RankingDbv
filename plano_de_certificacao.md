
# Plano de Certificação do Sistema Ranking DBV

Este documento descreve os passos para validar a funcionalidade completa do sistema, garantindo que as entradas de dados críticas estejam operacionais.

## 1. Gestão de Membros e Funções (FUNÇÃO)
**Objetivo:** Verificar se é possível cadastrar, editar e remover membros com diferentes cargos e atribuí-los corretamente.

*   [ ] **Teste 1.1: Cadastro de Novo Membro (Com Sucesso)**
    *   Acessar menu "Membros".
    *   Clicar em "Novo Membro".
    *   Preencher: Nome, Email, Senha (Obrigatória), Cargo (ex: Conselheiro), Unidade (Sem Unidade), Classe (Sem Classe).
    *   Clicar em "Salvar".
    *   **Resultado Esperado:** Modal fecha, alerta de sucesso aparece, novo membro aparece na lista.

*   [ ] **Teste 1.2: Cadastro com Unidade e Classe**
    *   (Pré-requisito: Ter uma Unidade criada).
    *   Criar novo membro selecionando uma Unidade e uma Classe (ex: Amigo).
    *   **Resultado Esperado:** Membro criado e já vinculado à unidade correta.

*   [ ] **Teste 1.3: Edição de Membro**
    *   Clicar no ícone de "Editar" de um membro.
    *   Alterar o Cargo para "Diretor" e mudar a Unidade.
    *   Clicar em "Salvar".
    *   **Resultado Esperado:** Dados atualizados na tabela.

*   [ ] **Teste 1.4: Exclusão**
    *   Clicar no ícone de "Lixeira" de um membro de teste.
    *   Confirmar exclusão.
    *   **Resultado Esperado:** Membro removido da lista.

## 2. Gestão de Unidades (UNIDADE)
**Objetivo:** Verificar a criação e gestão de unidades.

*   [ ] **Teste 2.1: Criação de Unidade**
    *   Acessar menu "Unidades".
    *   Clicar em "Nova Unidade".
    *   Nome: "Unidade Alpha".
    *   **Resultado Esperado:** Unidade criada e exibida no grid.

*   [ ] **Teste 2.2: Adicionar Membros à Unidade**
    *   Editar a "Unidade Alpha".
    *   Na aba "Membros", selecionar alguns Desbravadores e Conselheiros.
    *   Salvar.
    *   **Resultado Esperado:** Contador de membros no card da unidade atualiza. Ao ver detalhes do Membro na tela de Membros, a unidade deve constar lá.

## 3. Gestão de Requisitos e Classes (REQUISITOS)
**Objetivo:** Validar o fluxo de cumprimento de requisitos das classes.

*   [ ] **Teste 3.1: Visualização de Requisitos (Como Desbravador)**
    *   Logar como um Desbravador (ou Simular via Admin view).
    *   Acessar "Classes".
    *   Verificar se a lista de requisitos da classe atual aparece.

*   [ ] **Teste 3.2: Cumprimento de Requisito**
    *   Clicar em um requisito (ex: "Ler o livro do ano").
    *   Enviar uma resposta (texto ou upload - se houver).
    *   **Resultado Esperado:** Status muda para "Pendente" ou "Aguardando Aprovação".

*   [ ] **Teste 3.3: Aprovação (Como Conselheiro/Diretor)**
    *   Acessar "Membros" -> "Aprovações Pendentes" (se houver aba) OU Acessar o Perfil do Membro -> Aba Requisitos.
    *   Aprovar o requisito pendente.
    *   **Resultado Esperado:** Status do requisito muda para "Concluído" e barra de progresso do membro avança.

## 4. Gestão de Eventos (EVENTOS)
**Objetivo:** Verificar agenda e presença.

*   [ ] **Teste 4.1: Criar Evento**
    *   Acessar "Programação" (Calendário).
    *   Clicar em uma data futura.
    *   Criar evento "Reunião Regular", Tipo: Reunião, Pontuação: 100.
    *   **Resultado Esperado:** Evento aparece no calendário.

*   [ ] **Teste 4.2: Pontuação Automática (Presença)**
    *   (Se implementado) Marcar presença para membros no evento.
    *   **Resultado Esperado:** Pontuação do membro no Ranking aumenta.

## 5. Dados do Clube (CLUBE)
**Objetivo:** Garantir integridade dos dados da organização.

*   [ ] **Teste 5.1: Configurações**
    *   Acessar as configurações do clube (se disponível para Admin).
    *   Verificar Nome e Logo.

---
**Observação:**
Se ocorrer qualquer erro "Internal Server Error" (500), por favor tire um print e nos envie imediatamente. O erro mais comum corrigido recentemente foi a falta de senha no cadastro de novos membros.
