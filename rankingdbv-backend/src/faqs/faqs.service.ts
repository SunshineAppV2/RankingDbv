import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FaqsService {
    constructor(private prisma: PrismaService) { }

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
        const count = await this.prisma.fAQ.count();
        if (count > 0) return { message: 'FAQs already seeded' };

        const defaultFaqs = [
            // FINANCEIRO
            {
                category: 'FINANCEIRO',
                question: 'Como faço para pagar minha mensalidade?',
                answer: 'Você pode pagar diretamente ao tesoureiro do clube ou via PIX. Após o pagamento, envie o comprovante na aba "Tesouraria" clicando em "Nova Transação" > "Receita (Pagamento)".',
                isVisible: true
            },
            {
                category: 'FINANCEIRO',
                question: 'Onde vejo minhas dívidas?',
                answer: 'Acesse o menu "Financeiro". Lá você verá um resumo de mensalidades em atraso ou a vencer.',
                isVisible: true
            },
            // EVENTOS
            {
                category: 'EVENTOS',
                question: 'Como me inscrevo em um acampamento?',
                answer: 'Vá até a aba "Eventos". Se houver inscrições abertas, clique no botão "Gerenciar" ou peça ao seu Conselheiro/Diretor para incluí-lo.',
                isVisible: true
            },
            {
                category: 'EVENTOS',
                question: 'Onde vejo o que levar para o evento?',
                answer: 'Nos detalhes do evento (clicando no card), geralmente há uma descrição com a lista de materiais. Caso não tenha, procure seu conselheiro.',
                isVisible: true
            },
            // RANKING
            {
                category: 'RANKING',
                question: 'Como ganho pontos no Ranking?',
                answer: 'Você ganha pontos por: Presença em reuniões e eventos, cumprimento de requisitos de classes/especialidades, e uso correto do uniforme.',
                isVisible: true
            },
            {
                category: 'RANKING',
                question: 'O que signifca o Ranking de Unidades?',
                answer: 'É a soma dos pontos de todos os membros da unidade. A unidade com mais pontos ganha destaque e prêmios!',
                isVisible: true
            },
            // GERAL
            {
                category: 'GERAL',
                question: 'Como altero minha foto de perfil?',
                answer: 'No menu principal, clique em "Perfil" ou na sua foto atual. Lá você encontrará a opção para alterar a imagem.',
                isVisible: true
            },
            {
                category: 'GERAL',
                question: 'Esqueci minha senha, o que faço?',
                answer: 'Peça ao Diretor ou Secretário do clube para redefinir sua senha através do painel administrativo.',
                isVisible: true
            }
        ];

        for (const f of defaultFaqs) {
            await this.prisma.fAQ.create({ data: f });
        }

        return { message: `Seeded ${defaultFaqs.length} FAQs` };
    }
}
