import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqsService implements OnModuleInit {
    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.seedDefaultFaqs();
    }

    async findAll(onlyVisible: boolean = true) {
        return this.prisma.fAQ.findMany({
            where: onlyVisible ? { isVisible: true } : {},
            orderBy: { createdAt: 'asc' } // Or category priority
        });
    }

    async toggleVisibility(id: string) {
        const faq = await this.prisma.fAQ.findUnique({ where: { id } });
        if (!faq) throw new Error('FAQ not found');
        return this.prisma.fAQ.update({
            where: { id },
            data: { isVisible: !faq.isVisible }
        });
    }

    async seedDefaultFaqs() {
        // Clear existing to avoid duplicates when re-seeding if needed (optional)
        // await this.prisma.fAQ.deleteMany({}); 

        const count = await this.prisma.fAQ.count();
        if (count > 20) return { message: 'FAQs already seeded' };

        const defaultFaqs = [
            // GESTÃO MASTER (CONFIGURAÇÕES)
            {
                category: 'GESTÃO MASTER',
                question: 'Como gerenciar os clubes e suas assinaturas?',
                answer: '1. No menu "Configurações", acesse "Gerenciar Assinatura".\n2. Você verá uma lista com o "Status de Pagamento" de cada clube.\n3. Clique em "Gerenciar" para ver detalhes, alterar a data de vencimento ou o plano (Bronze, Prata, Ouro).\n4. Se um clube pagar, você pode adicionar tempo ao vencimento atual usando os botões "+1 Mês" ou "+1 Ano".',
                isVisible: true
            },
            {
                category: 'GESTÃO MASTER',
                question: 'Como enviar um aviso urgente para TODOS do sistema?',
                answer: '1. Vá em "Configurações" > "Mensagens do Sistema".\n2. Clique em "Nova Mensagem Global".\n3. Digite o título e o conteúdo.\n4. Ao enviar, todos os membros de todos os clubes receberão uma notificação instantânea no sino e um alerta no painel.',
                isVisible: true
            },

            // MEU ACESSO (PERFIL E REQUISITOS)
            {
                category: 'MEU ACESSO',
                question: 'Como preencher meus requisitos de classe?',
                answer: '1. No menu "Meu Acesso", clique em "Meus Requisitos".\n2. Escolha sua classe (ex: Amigo).\n3. Selecione o requisito desejado.\n4. Se for "Ação", basta marcar como feito. Se for "Texto", digite sua resposta. Se for "Anexo", suba uma foto.\n5. Clique em "Enviar para Aprovação". O instrutor será notificado.',
                isVisible: true
            },
            {
                category: 'MEU ACESSO',
                question: 'Onde vejo as medalhas e especialidades que já ganhei?',
                answer: '1. Acesse "Meu Perfil".\n2. Role até a seção "Conquistas" ou "Especialidades Concluídas".\n3. Lá estarão todas as insígnias aprovadas pela diretoria.',
                isVisible: true
            },
            {
                category: 'MEU ACESSO',
                question: 'Como funciona o menu "Minha Família"?',
                answer: 'Este menu é para Pais ou Responsáveis.\n1. Se o seu filho está cadastrado, ele aparecerá aqui.\n2. Você pode ver o progresso dele no ranking, se ele está presente nas reuniões e se há mensalidade pendente.',
                isVisible: true
            },

            // GESTÃO DO CLUBE (ADMIN/SECRETARIA)
            {
                category: 'GESTÃO DO CLUBE',
                question: 'Como fazer a chamada do domingo?',
                answer: '1. No menu "Gestão", acesse "Chamada / Presença".\n2. Clique em "Nova Reunião" ou selecione uma data.\n3. Marque a presença de cada membro.\n4. Dica: Use o botão "Marcar todos como Presente" para agilizar e desmarque apenas quem faltou.',
                isVisible: true
            },
            {
                category: 'GESTÃO DO CLUBE',
                question: 'Como criar e gerenciar as Unidades (Ex: Águia, Pantera)?',
                answer: '1. Vá em "Gestão" > "Unidades".\n2. Clique em "Nova Unidade" para definir o nome e o grito de guerra.\n3. Clique no ícone de membros para adicionar o conselheiro e os desbravadores àquela unidade.',
                isVisible: true
            },
            {
                category: 'GESTÃO DO CLUBE',
                question: 'Como funcionam as Aprovações?',
                answer: '1. No menu "Solicitações (Aprovações)", você verá tudo que os membros enviaram (requisitos, anotações).\n2. Analise o que foi enviado.\n3. Clique em "Aprovar" para o membro ganhar os pontos ou "Rejeitar" enviando um motivo para ele corrigir.',
                isVisible: true
            },
            {
                category: 'GESTÃO DO CLUBE',
                question: 'Como gerar relatórios para a comissão ou secretaria?',
                answer: '1. Acesse "Relatórios & Métricas".\n2. Escolha o tipo (Membros, Financeiro ou Frequência).\n3. O sistema gerará um PDF ou gráfico com os dados atualizados do clube.',
                isVisible: true
            },

            // ACOMPANHAMENTO (INSTRUTORES)
            {
                category: 'ACOMPANHAMENTO',
                question: 'Como ver o progresso geral da minha classe?',
                answer: '1. No menu "Acompanhamento", clique em "Progresso Classes".\n2. Você verá uma lista com todos os alunos e uma barra de porcentagem.\n3. Isso ajuda a identificar quem está ficando para trás nos requisitos.',
                isVisible: true
            },
            {
                category: 'ACOMPANHAMENTO',
                question: 'Onde encontro a lista de todas as especialidades do clube?',
                answer: '1. Acesse "Acompanhamento" > "Progresso Especialidades".\n2. Você pode filtrar por área (ex: Natureza, Atividades Recreativas).\n3. Clicando em uma área, o sistema mostra quais membros estão fazendo especialidades daquele tema.',
                isVisible: true
            },

            // FINANCEIRO E TESOURARIA
            {
                category: 'FINANCEIRO',
                question: 'Como registrar gastos (compras) do clube?',
                answer: '1. Vá em "Tesouraria".\n2. Clique em "Nova Transação" > "Despesa".\n3. Preencha o valor e anexe a foto da nota fiscal se possível.\n4. Isso descontará automaticamente do saldo total do clube.',
                isVisible: true
            },
            {
                category: 'FINANCEIRO',
                question: 'Como ver o saldo atual do caixa?',
                answer: '1. Na tela principal da "Tesouraria", existe um card de "Saldo Total".\n2. Lá você vê a soma de todas as receitas (mensalidades, doações) menos as despesas.',
                isVisible: true
            },

            // LOJA VIRTUAL
            {
                category: 'LOJA VIRTUAL',
                question: 'Como cadastrar novos produtos no "Cantinho"?',
                answer: '1. Se você for Admin, acesse a "Loja Virtual".\n2. Clique em "Novo Produto".\n3. Defina o nome, preço em "Pontos", foto e estoque.\n4. O produto aparecerá imediatamente para os desbravadores comprarem.',
                isVisible: true
            },

            // GERAL E CONFIGURAÇÕES
            {
                category: 'GERAL',
                question: 'Como funciona o "Puxe para Atualizar"?',
                answer: 'Se você estiver no celular, basta deslizar o dedo de cima para baixo na tela. O sistema buscará as últimas notificações e pontos lançados no servidor.',
                isVisible: true
            },
            {
                category: 'GERAL',
                question: 'Como mudar as permissões dos meus secretários/conselheiros?',
                answer: '1. Vá em "Membros".\n2. Edite o perfil da pessoa.\n3. No campo "Cargo", escolha a função certa. O sistema liberará automaticamente apenas os botões referentes àquele cargo (ex: Tesoureiro só vê financeiro).',
                isVisible: true
            },
            {
                category: 'GERAL',
                question: 'O que fazer se os pontos não aparecerem?',
                answer: '1. Verifique se a Internet está ativa.\n2. Use o botão de "Atualizar" (ícone de setas redondas no topo).\n3. Se ainda não aparecer, peça para o diretor confirmar se ele realmente "Aprovou" a atividade.',
                isVisible: true
            }
        ];

        for (const f of defaultFaqs) {
            await this.prisma.fAQ.create({ data: f });
        }

        return { message: `Seeded ${defaultFaqs.length} FAQs` };
    }
}
