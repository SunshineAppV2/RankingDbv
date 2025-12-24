
import { PrismaClient, RequirementType, RequirementStatus } from '@prisma/client';
import { hash } from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Pending Class Requirement...');

    // 1. Ensure Club and User Exists (using existing or creating)
    let club = await prisma.club.findFirst();
    if (!club) {
        club = await prisma.club.create({
            data: { name: 'Clube Teste' }
        });
    }

    const email = 'pendente@teste.com';
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        user = await prisma.user.create({
            data: {
                email,
                name: 'Usuario Pendente',
                password: await hash('123456', 10),
                clubId: club.id,
                role: 'PATHFINDER'
            }
        });
    }

    // 2. Create a Class Requirement
    const reqDescription = 'Requisito de Classe Teste - Pendente';
    // Check if exists to avoid dup
    let requirement = await prisma.requirement.findFirst({
        where: { description: reqDescription }
    });

    if (!requirement) {
        requirement = await prisma.requirement.create({
            data: {
                description: reqDescription,
                type: RequirementType.TEXT,
                dbvClass: 'AMIGO', // Class Requirement
                area: 'Geral'
            }
        });
    }

    // 3. User submits answer (Pending)
    const userReq = await prisma.userRequirement.upsert({
        where: { userId_requirementId: { userId: user.id, requirementId: requirement.id } },
        create: {
            userId: user.id,
            requirementId: requirement.id,
            status: RequirementStatus.PENDING,
            answerText: 'Minha resposta para classe',
            completedAt: new Date()
        },
        update: {
            status: RequirementStatus.PENDING
        }
    });

    console.log('User Requirement created/updated:', userReq);

    // 4. Verify what findAllPending returns
    // We can't easily call Service method here directly without Nest context, 
    // but we can query exactly like the service does.

    const pendingRequirements = await prisma.userRequirement.findMany({
        where: {
            status: RequirementStatus.PENDING,
            user: { clubId: club.id }
        },
        include: {
            user: true,
            requirement: {
                include: { specialty: true }
            }
        }
    });

    console.log('--- Pending Requirements Query Result ---');
    console.log(JSON.stringify(pendingRequirements, null, 2));

}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
