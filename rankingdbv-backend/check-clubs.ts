
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubs = await prisma.club.findMany();
    console.log('--- CLUBS ---');
    clubs.forEach(c => console.log(`${c.id}: ${c.name}`));
    console.log('-------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
