
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Create Second Club
    const club2 = await prisma.club.create({
        data: {
            name: 'Clube Leões da Montanha',
            status: 'ACTIVE',
            planTier: 'TRIAL'
        }
    });
    console.log(`Created Club: ${club2.name} (${club2.id})`);

    // 2. Move 'Desbravador 01' to this new club
    const user = await prisma.user.updateMany({
        where: { name: 'Desbravador 01' },
        data: { clubId: club2.id }
    });
    console.log(`Moved user to new club.`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
