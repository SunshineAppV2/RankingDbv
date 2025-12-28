
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Updating "Orion de Barcarena" users to ACTIVE to validate rules...');

    const club = await prisma.club.findFirst({
        where: { name: { contains: 'Orion', mode: 'insensitive' } }
    });

    if (!club) {
        console.log('Club not found.');
        return;
    }

    // Activate all users in this club
    await prisma.user.updateMany({
        where: { clubId: club.id },
        data: { isActive: true }
    });
    console.log('All users activated.');

    // Count again
    console.log('Validating new counts...');
    const users = await prisma.user.findMany({
        where: { clubId: club.id, isActive: true },
        select: { role: true, name: true }
    });

    let paidCount = 0;
    let freeCount = 0;

    users.forEach(u => {
        // Rule: Only PARENT and MASTER are FREE. Everyone else is PAID.
        if (u.role !== 'PARENT' && u.role !== 'MASTER') {
            paidCount++;
        } else {
            console.log(`- Free Member: ${u.name} (${u.role})`);
            freeCount++;
        }
    });

    console.log('------------------------------------------------');
    console.log(`TOTAL USERS: ${users.length}`);
    console.log(`PAID MEMBERS (License): ${paidCount}`);
    console.log(`FREE MEMBERS (Parents/Master): ${freeCount}`);
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
