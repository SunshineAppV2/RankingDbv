
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for club "Orion"...');

    // Find clubs matching 'Orion'
    const clubs = await prisma.club.findMany({
        where: {
            name: { contains: 'Orion', mode: 'insensitive' }
        },
        include: {
            users: {
                select: { role: true, name: true, email: true, isActive: true }
            }
        }
    });

    if (clubs.length === 0) {
        console.log('No club found with name containing "Orion".');
        return;
    }

    for (const club of clubs) {
        console.log(`\nClub: ${club.name} (ID: ${club.id})`);
        console.log('--- Users ---');

        const users = club.users;
        const roleCounts: Record<string, number> = {};

        let paidCount = 0;
        let freeCount = 0;

        users.forEach(u => {
            // Count by Role
            roleCounts[u.role] = (roleCounts[u.role] || 0) + 1;

            // Apply Logic
            const isPaid = u.role !== 'PARENT' && u.role !== 'MASTER' && u.isActive;
            const isFree = (u.role === 'PARENT' || u.role === 'MASTER') && u.isActive;

            if (u.isActive) {
                if (u.role !== 'PARENT' && u.role !== 'MASTER') {
                    paidCount++;
                } else {
                    freeCount++;
                }
            }

            console.log(`- ${u.name} (${u.role}) [${u.isActive ? 'Active' : 'Inactive'}] -> ${isPaid ? 'PAID' : 'FREE/INACTIVE'}`);
        });

        console.log('\n--- Summary ---');
        console.log('Role Breakdown:', roleCounts);
        console.log(`Calculated PAID Count: ${paidCount}`);
        console.log(`Calculated FREE Count: ${freeCount}`);
        console.log(`Total Users in DB: ${users.length}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
