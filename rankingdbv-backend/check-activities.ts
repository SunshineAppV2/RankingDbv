
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const activities = await prisma.activity.findMany({
        include: { club: true }
    });

    console.log('--- ACTIVITIES ---');
    if (activities.length === 0) console.log('No activities found.');
    activities.forEach(a => {
        console.log(`[${a.id}] ${a.title} (${a.points} pts) - Club: ${a.clubId} (${a.club?.name})`);
    });
    console.log('------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
