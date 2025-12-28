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
        if (count > 10) return { message: 'FAQs already seeded' };

        const defaultFaqs = [
            // GESTÃO MASTER
            {
                category: 'GESTÃO MASTER',
                question: 'Como gerencio as licenças dos clubes?',
                answer: '1. Acesse o menu "Gestão de Clubes".\n2. Na lista, identifique o status do clube (Ativo, Vencido ou Vence em Breve).\n3. Use o botão "Gerenciar" para alterar o plano, limite de membros ou data de vencimento.',
                isVisible: true
            },
            {
                category: 'GESTÃO MASTER',
                question: 'Como envio cobranças para os diretores?',
                answer: '1. Na tela de "Gestão de Clubes", clique no botão de Cifrão ($).\n2. Uma mensagem padrão com sua chave PIX aparecerá.\n3. Você pode editar o texto e clicar em "Enviar". Os diretores receberão uma notificação instantânea.',
                isVisible: true
            },

            // UNIDADES E MEMBROS
            {
                category: 'UNIDADES E MEMBROS',
                question: 'Como crio uma nova unidade no meu clube?',
                answer: '1. Vá em "Unidades".\n2. Clique em "Nova Unidade".\n3. Defina o nome e selecione quais membros farão parte dela.\n4. Salve e a unidade já aparecerá no ranking.',
                isVisible: true
            },
            {
                category: 'UNIDADES E MEMBROS',
                question: 'Como aprovo novos membros que se cadastraram?',
                answer: '1. No menu lateral, acesse "Membros".\n2. Os novos cadastros aparecem com status "Pendente".\n3. Clique em "Gerenciar" e altere o status para "Ativo" para liberar o acesso dele.',
                isVisible: true
            },

            // RANKING E PONTOS
            {
                category: 'RANKING E PONTOS',
                question: 'Como lanço pontos para os desbravadores?',
                answer: '1. Acesse o menu "Lançar Pontos".\n2. Escolha se a atividade é Individual ou de Unidade.\n3. Selecione a Atividade na lista.\n4. Marque os membros que participaram.\n5. Clique em "Lançar Pontos" e o ranking atualizará na hora.',
                isVisible: true
            },
            {
                category: 'RANKING E PONTOS',
                question: 'Como faço a chamada (presença) das reuniões?',
                answer: '1. Vá em "Reuniões".\n2. Clique em "Gerenciar Presença" na reunião desejada.\n3. Marque "Presente", "Falta" ou "Justificado" para cada membro.\n4. Os pontos de presença são somados automaticamente.',
                isVisible: true
            },

            // ESPECIALIDADES E REQUISITOS
            {
                category: 'ESPECIALIDADES E REQUISITOS',
                question: 'Como envio as respostas das minhas especialidades?',
                answer: '1. No seu perfil ou na aba "Especialidades", escolha o requisito.\n2. Se for texto, digite sua resposta no campo indicado.\n3. Se exigir foto ou documento, use o botão de "Anexo".\n4. Clique em "Enviar" e aguarde a aprovação do seu instrutor.',
                isVisible: true
            },
            {
                category: 'ESPECIALIDADES E REQUISITOS',
                question: 'Como aprovo o requisito de um desbravador?',
                answer: '1. Se você for Instrutor ou Diretor, acesse "Aprovações".\n2. Veja o texto ou arquivo enviado pelo membro.\n3. Clique em "Aprovar" (Ganha pontos) ou "Rejeitar" (Com comentário do que falta).',
                isVisible: true
            },

            // FINANCEIRO
            {
                category: 'FINANCEIRO',
                question: 'Como registro o pagamento de uma mensalidade?',
                answer: '1. Vá em "Financeiro" e clique em "Nova Transação".\n2. Selecione "Receita".\n3. Escolha o membro que pagou.\n4. Marque a categoria "Mensalidade" e o valor.\n5. O caixa do clube atualizará e o membro poderá ver o recibo.',
                isVisible: true
            },
            {
                category: 'FINANCEIRO',
                question: 'Como os pais veem a situação financeira do filho?',
                answer: '1. Os pais logam com o email deles.\n2. Acessam o menu "Meus Filhos".\n3. Selecionam o filho e clicam na aba "Financeiro" para ver o que foi pago e o que está pendente.',
                isVisible: true
            },

            // LOJA (CANTINHO)
            {
                category: 'LOJA (CANTINHO)',
                question: 'Como os membros compram itens com pontos?',
                answer: '1. No menu "Loja", o membro vê os itens disponíveis.\n2. Se ele tiver pontos suficientes, clica em "Comprar".\n3. O pedido cai para a diretoria entregar o item físico.',
                isVisible: true
            },

            // GERAL
            {
                category: 'GERAL',
                question: 'Como altero minha foto ou dados?',
                answer: '1. Clique no seu Nome ou Foto no topo do menu lateral.\n2. Selecione "Dados Pessoais".\n3. Altere as informações ou a imagem e clique em "Salvar".',
                isVisible: true
            },
            {
                category: 'GERAL',
                question: 'O site não carrega ou dá erro, o que fazer?',
                answer: '1. Saia do sistema (Sair).\n2. Limpe o cache do seu navegador ou use uma aba anônima.\n3. Se persistir, contate o Diretor do seu clube para verificar se a internet ou o servidor do sistema estão ativos.',
                isVisible: true
            }
        ];

        for (const f of defaultFaqs) {
            await this.prisma.fAQ.create({ data: f });
        }

        return { message: `Seeded ${defaultFaqs.length} FAQs` };
    }
}
