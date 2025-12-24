import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const count = await prisma.specialty.count();
    console.log(`Total specialties: ${count}`);

    const all = await prisma.specialty.findMany();
    console.log('List of specialties:', all.map(s => s.name));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
