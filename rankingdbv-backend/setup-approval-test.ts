import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Setting up Approval Test Data ---');

    // 1. Find a Club
    const club = await prisma.club.findFirst();
    if (!club) throw new Error('No club found. Run seed first.');
    console.log(`Club found: ${club.name} (${club.id})`);

    // 2. Find a Pathfinder (User) in that club
    let user = await prisma.user.findFirst({
        where: { clubId: club.id, role: 'PATHFINDER' }
    });

    if (!user) {
        console.log('No Pathfinder found, creating one...');
        user = await prisma.user.create({
            data: {
                name: 'Desbravador Teste',
                email: `test-pathfinder-${Date.now()}@test.com`,
                password: '123', // plain for test
                role: 'PATHFINDER',
                clubId: club.id
            }
        });
    }
    console.log(`Pathfinder: ${user.name} (${user.id})`);

    // 3. Find a Specialty and Requirement
    let specialty = await prisma.specialty.findFirst({
        include: { requirements: true }
    });

    if (!specialty || specialty.requirements.length === 0) {
        console.log('No specialty found or empty requirements. Creating one...');
        specialty = await prisma.specialty.create({
            data: {
                name: 'Especialidade de Teste',
                area: 'Geral',
                requirements: {
                    create: [
                        { description: 'Requisito de Teste 1', type: 'TEXT' },
                        { description: 'Requisito de Teste 2 (Arquivo)', type: 'FILE' }
                    ]
                }
            },
            include: { requirements: true }
        });
    }

    const requirement = specialty.requirements[0];
    console.log(`Specialty: ${specialty.name}, Req: ${requirement.description}`);

    // 4. Submit Answer (Create pending UserRequirement)
    // Ensure we delete any existing one first to make it fresh
    await prisma.userRequirement.deleteMany({
        where: { userId: user.id, requirementId: requirement.id }
    });

    await prisma.userRequirement.create({
        data: {
            userId: user.id,
            requirementId: requirement.id,
            status: 'PENDING',
            answerText: 'Esta é uma resposta de teste para aprovação.',
            answerFileUrl: 'http://example.com/arquivo-teste.pdf',
            completedAt: new Date()
        }
    });

    console.log('\nSUCCESS! Pending requirement created.');
    console.log('------------------------------------------------');
    console.log(`PLEASE LOG IN AS ADMIN FOR CLUB: ${club.name}`);
    console.log('Then go to "Atividades" -> "Aprovação", and you should see this request.');
    console.log('------------------------------------------------');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
