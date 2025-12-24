
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const reqs = await prisma.requirement.findMany({
        where: { area: null },
        take: 20,
        select: {
            id: true,
            description: true,
            dbvClass: true,
            specialtyId: true
        }
    });

    console.log(JSON.stringify(reqs, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
