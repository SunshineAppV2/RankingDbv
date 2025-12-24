
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubId = 'c4f6d951-eaa8-457a-930a-d2dcae5bd556'; // SUNSHINE
    console.log(`Creating activity for Club: ${clubId}`);

    try {
        const activity = await prisma.activity.create({
            data: {
                title: 'Atividade de Teste Backend',
                description: 'Criada via script de verificação',
                points: 50,
                clubId: clubId
            }
        });

        console.log(`SUCCESS: Created Activity [${activity.id}]`);
    } catch (error) {
        console.error('ERROR creating activity:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
