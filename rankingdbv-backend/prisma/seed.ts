import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding database...');

    const password = await bcrypt.hash('123456', 10);

    // 1. Create Master Club
    const club = await prisma.club.upsert({
        where: { slug: 'master-club' },
        update: {},
        create: {
            name: 'Clube Master',
            slug: 'master-club',
            status: 'ACTIVE',
            planTier: 'PLAN_G'
        }
    });

    console.log('Created Club:', club.name);

    // 2. Create Master User
    const user = await prisma.user.upsert({
        where: { email: 'master@cantinhodbv.com' },
        update: {
            role: 'OWNER', // Ensure role is Owner
            clubId: club.id
        },
        create: {
            email: 'master@cantinhodbv.com',
            name: 'Master Admin',
            password,
            role: 'OWNER',
            clubId: club.id
        }
    });

    // 3. Create Units
    const unit1 = await prisma.unit.upsert({
        where: { id: 'default-unit-alpha' }, // Determine a fixed ID or finding method. Actually for seed simpler to just findFirst
        update: {},
        create: {
            name: 'Unidade Alpha',
            clubId: club.id
        }
    }).catch(async () => {
        // Fallback if ID-based upsert isn't easy without ID. 
        // Better pattern: findFirst
        const existing = await prisma.unit.findFirst({ where: { name: 'Unidade Alpha', clubId: club.id } });
        if (existing) return existing;
        return prisma.unit.create({ data: { name: 'Unidade Alpha', clubId: club.id } });
    });

    // 4. Create Parent
    const parent = await prisma.user.upsert({
        where: { email: 'pai@cantinhodbv.com' },
        update: {},
        create: {
            email: 'pai@cantinhodbv.com',
            name: 'PAI RESPONSÁVEL',
            password,
            role: 'PARENT',
            clubId: club.id
        }
    });

    // 5. Create Child (Pathfinder) -> Renaming to standard
    const child = await prisma.user.upsert({
        where: { email: 'filho@cantinhodbv.com' },
        update: {
            name: 'DESBRAVADOR FILHO'
        },
        create: {
            email: 'filho@cantinhodbv.com',
            name: 'DESBRAVADOR FILHO',
            password,
            role: 'PATHFINDER',
            clubId: club.id,
            unitId: unit1.id,
            parentId: parent.id
        }
    });

    // 6. Create Initial Financial Debt
    // Check intersection to avoid duplicates
    const existingTransaction = await prisma.transaction.findFirst({
        where: {
            payerId: parent.id,
            description: 'Mensalidade Janeiro [PENDENTE]'
        }
    });

    if (!existingTransaction) {
        await prisma.transaction.create({
            data: {
                type: 'INCOME', // Income for club
                amount: 50.00,
                description: 'Mensalidade Janeiro [PENDENTE]',
                category: 'Mensalidade',
                status: 'PENDING',
                date: new Date(),
                clubId: club.id,
                payerId: parent.id, // Assigned to parent to pay
                dueDate: new Date(new Date().setDate(new Date().getDate() + 10)) // Due in 10 days
            }
        });
    }

    // --- NEW SEED LOGIC: 10 DESBRAVADORES ---
    console.log('Seeding 10 Extra Pathfinders for Test Club...');

    // Create Delta Unit
    const unit2 = await prisma.unit.upsert({
        where: { id: 'default-unit-delta' }, // Simple ID strategy for seed
        update: {},
        create: {
            name: 'Unidade Delta',
            clubId: club.id
        }
    }).catch(async () => {
        const existing = await prisma.unit.findFirst({ where: { name: 'Unidade Delta', clubId: club.id } });
        if (existing) return existing;
        return prisma.unit.create({ data: { name: 'Unidade Delta', clubId: club.id } });
    });

    const extraDbvs = [
        { first: 'GABRIEL', sex: 'M' },
        { first: 'LUCAS', sex: 'M' },
        { first: 'MATHEUS', sex: 'M' },
        { first: 'PEDRO', sex: 'M' },
        { first: 'RAFAEL', sex: 'M' },
        { first: 'ANA', sex: 'F' },
        { first: 'BEATRIZ', sex: 'F' },
        { first: 'JULIA', sex: 'F' },
        { first: 'MARIA', sex: 'F' },
        { first: 'SOPHIA', sex: 'F' }
    ];

    for (let i = 0; i < extraDbvs.length; i++) {
        const p = extraDbvs[i];
        const prefix = p.sex === 'M' ? 'DESBRAVADOR' : 'DESBRAVADORA';
        const fullName = `${prefix} ${p.first}`;
        const email = `${p.first.toLowerCase()}@clubeteste.com`;

        // Distribute: Evens -> Alpha, Odds -> Delta
        const unitId = i % 2 === 0 ? unit1.id : unit2.id;

        await prisma.user.upsert({
            where: { email },
            update: {
                name: fullName,
                unitId: unitId,
                role: 'PATHFINDER',
                clubId: club.id,
                sex: p.sex // Assuming sex field exists, otherwise ignore or check schema
            },
            create: {
                email,
                name: fullName,
                password, // Hash 123456
                role: 'PATHFINDER',
                clubId: club.id,
                unitId: unitId,
                sex: p.sex
            }
        });
        console.log(`Upserted: ${fullName} (${email}) -> Unit: ${i % 2 === 0 ? 'Alpha' : 'Delta'}`);
    }

    // 7. Create Demo Requirement and Assign to Child
    console.log('Seeding Requirements...');

    // Create Requirement 'AM-01'
    let req1 = await prisma.requirement.findFirst({ where: { code: 'AM-01' } });

    if (!req1) {
        req1 = await prisma.requirement.create({
            data: {
                code: 'AM-01',
                description: 'Memorizar e recitar o Voto do Desbravador',
                dbvClass: 'AMIGO',
                type: 'TEXT'
            }
        });
    }

    // Assign to Child (PENDING) - Check existence first
    const existingReq = await prisma.userRequirement.findFirst({
        where: { userId: child.id, requirementId: req1.id }
    });

    if (!existingReq) {
        await prisma.userRequirement.create({
            data: {
                userId: child.id,
                requirementId: req1.id,
                status: 'PENDING',
                answerText: 'Prometo ser fiel à minha consciência...'
            }
        });
        console.log('Assigned Pending Requirement to Child.');
    }

    // 8. Seed FAQs (System Questions)
    console.log('Seeding FAQs...');
    const faqs = [
        // --- GERAL & ACESSO ---
        {
            category: 'GERAL',
            question: 'O que é o Ranking DBV?',
            answer: 'É uma plataforma completa de gestão para Clubes, onde você acompanha seu progresso, classe e especialidades.\n\nFuncionalidades:\n- Ranking em Tempo Real\n- Carteirinha Virtual\n- Gestão Financeira\n- Loja Virtual Gamificada'
        },
        {
            category: 'GERAL',
            question: 'Como faço login?',
            answer: 'Acesse com seu e-mail cadastrado e senha.\n\nEsqueci a senha:\n1. Peça ao seu Diretor ou Conselheiro para resetar.\n2. No primeiro acesso, vá em "Meu Perfil" e altere para uma senha pessoal.'
        },
        {
            category: 'GERAL',
            question: 'Como alterar minha Senha/Foto?',
            answer: 'Passo a Passo:\n1. Clique na sua foto no topo direito.\n2. Escolha "Meu Perfil".\n3. Na aba "Pessoal", clique na câmera para mudar a foto.\n4. Digite a nova senha no campo "Senha" e Salve.'
        },

        // --- RANKING & GAMIFICAÇÃO ---
        {
            category: 'RANKING',
            question: 'Como ganhar pontos (XP)?',
            answer: 'Você acumula XP através de:\n- **Presença**: Ir às reuniões e eventos.\n- **Pontualidade**: Chegar no horário.\n- **Uniforme**: Estar com o uniforme completo.\n- **Mensalidade**: Pagar em dia.\n- **Requisitos**: Completar itens de classe e especialidades.\n- **Bíblia/Material**: Levar sua Bíblia e caderno.'
        },
        {
            category: 'RANKING',
            question: 'O que são as Ligas?',
            answer: 'Conforme você ganha pontos, você sobe de Liga:\n🥉 **Bronze**: Iniciante\n🥈 **Prata**: Intermediário\n🥇 **Ouro**: Avançado\n💎 **Diamante**: Elite\n\nSua liga é exibida com um emblema ao lado do seu nome.'
        },
        {
            category: 'RANKING',
            question: 'Faixas Etárias (A e B)',
            answer: 'Para ser justo, o ranking separa por idade:\n- **Faixa A (10-12 anos)**: Compete entre si.\n- **Faixa B (13-15 anos)**: Compete entre si.\n\nA idade é calculada automaticamente (Ano Atual - Ano Nascimento).'
        },

        // --- CLASSES & ESPECIALIDADES ---
        {
            category: 'CLASSES',
            question: 'Como enviar requisitos?',
            answer: '1. Vá em "Meus Requisitos" ou "Minhas Atividades".\n2. Clique no requisito pendente.\n3. Digite o texto ou anexe uma foto/PDF.\n4. Clique em "Enviar".\n\nO instrutor receberá uma notificação para avaliar.'
        },
        {
            category: 'CLASSES',
            question: 'Como iniciar uma Especialidade?',
            answer: '1. Vá em "Progresso Especialid." > "Painel".\n2. Se você não tem especialidade ativa, o instrutor deve designar uma.\n3. Uma vez ativa, os requisitos aparecerão na sua lista para serem completados.'
        },

        // --- FINANCEIRO ---
        {
            category: 'FINANCEIRO',
            question: 'Como pagar mensalidade?',
            answer: '1. Vá em "Minhas Finanças".\n2. Veja os boletos/débitos pendentes.\n3. Faça o pagamento para o clube (PIX/Dinheiro).\n4. Clique em "Anexar Comprovante" e envie a foto.\n5. O tesoureiro dará a baixa e você ganhará os pontos.'
        },
        {
            category: 'FINANCEIRO',
            question: 'O que é o Seguro Anual?',
            answer: 'É uma taxa obrigatória para garantir sua segurança em eventos. Ela aparece no seu financeiro geralmente no início do ano e deve ser quitada prioritariamente.'
        },

        // --- LOJA VIRTUAL ---
        {
            category: 'LOJA',
            question: 'Como comprar na Loja?',
            answer: 'Use seus pontos (XP) ou Moedas Virtuais (se ativado).\n1. Vá em "Loja Virtual".\n2. Escolha o item.\n3. Clique em "Comprar".\n4. Se for item físico, retire com o tesoureiro.\n5. Se for virtual, ele vai para seu inventário no perfil.'
        },

        // --- EVENTOS & AGENDA ---
        {
            category: 'EVENTOS',
            question: 'Como me inscrever?',
            answer: '1. Vá em "Eventos".\n2. Clique em eventos com "Inscrições Abertas".\n3. Confirme sua participação.\n4. Se houver custo, um débito será gerado no seu financeiro.'
        },
        {
            category: 'EVENTOS',
            question: 'Como funciona a Chamada?',
            answer: 'Em cada evento ou reunião, o secretário ou conselheiro faz a chamada digital. Se você estiver presente, receberá os pontos automaticamente no seu extrato de atividades.'
        },

        // --- PAIS E RESPONSÁVEIS ---
        {
            category: 'FAMÍLIA',
            question: 'Sou Pai/Mãe, o que posso ver?',
            answer: 'A conta de "Responsável" permite:\n- Ver o Ranking e Atividades do(s) filho(s).\n- Acessar o Financeiro para pagamentos.\n- Receber Alertas de faltas ou atrasos.\n- Visualizar a Agenda do Clube.'
        },
        {
            category: 'FAMÍLIA',
            question: 'Como alternar entre filhos?',
            answer: 'Se você tem mais de um filho no clube, vá em "Minha Família" e selecione qual perfil deseja visualizar os detalhes.'
        },

        // --- CARGOS & PERMISSÕES ---
        {
            category: 'SISTEMA',
            question: 'O que faz um Conselheiro?',
            answer: 'O Conselheiro gerencia sua Unidade. Ele pode:\n- Ver dados dos membros da unidade.\n- Fazer a chamada da unidade.\n- Aprovar requisitos básicos.\n- Acompanhar o bem-estar dos desbravadores.'
        },
        {
            category: 'SISTEMA',
            question: 'O que faz um Instrutor?',
            answer: 'Foca no ensino. Pode:\n- Aprovar requisitos de Classes e Especialidades.\n- Gerenciar o progresso acadêmico de todos os membros.\n- Atribuir requisitos aos desbravadores.'
        },

        // --- SISTEMA ---
        {
            category: 'SISTEMA',
            question: 'Meus dados estão errados, como corrigir?',
            answer: 'Vá em "Meu Perfil". Alguns dados você mesmo pode editar. Dados sensíveis como Cargo e Unidade devem ser alterados pela secretaria.'
        },
        // --- SUPORTE ---
        {
            category: 'SISTEMA',
            question: 'Encontrei um erro, e agora?',
            answer: 'Se o sistema apresentar falha:\n1. Tente recarregar a página.\n2. Verifique sua internet.\n3. Se persistir, contate o Diretor para ele reportar ao suporte técnico.'
        }
    ];

    // Remove old PWA Question if exists
    await prisma.fAQ.deleteMany({
        where: {
            question: { contains: 'aplicativo para celular' }
        }
    });

    for (const faq of faqs) {
        const exists = await prisma.fAQ.findFirst({ where: { question: faq.question } });
        if (exists) {
            await prisma.fAQ.update({
                where: { id: exists.id },
                data: { answer: faq.answer, category: faq.category }
            });
        } else {
            await prisma.fAQ.create({
                data: {
                    ...faq,
                    isVisible: true
                }
            });
        }
    }
    console.log(`Seeded ${faqs.length} FAQs.`);

    console.log('--- SEED COMPLETE ---');
    console.log('Master: master@rankingdbv.com / 123456');
    console.log('Parent: pai@rankingdbv.com / 123456');
    console.log('Child:  filho@rankingdbv.com / 123456');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
