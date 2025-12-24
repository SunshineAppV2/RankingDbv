
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Inspecting Users...');
    const users = await prisma.user.findMany({
        take: 5,
        select: {
            id: true,
            name: true,
            points: true,
            lastClassMilestone: true,
            role: true,
            dbvClass: true,
            _count: {
                select: { requirements: { where: { status: 'APPROVED' } } }
            }
        }
    });

    console.log(JSON.stringify(users, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
