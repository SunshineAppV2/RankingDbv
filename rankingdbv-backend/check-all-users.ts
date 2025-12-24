
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        include: { club: true }
    });

    console.log('--- USER DIAGNOSTIC ---');
    users.forEach(u => {
        console.log(`Name: ${u.name.padEnd(20)} | Role: ${u.role.padEnd(10)} | Club: ${u.club?.name || 'NULL'} | ClubID: ${u.clubId} | Points: ${u.points}`);
    });
    console.log('-----------------------');
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
