
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Searching for "Orion" clubs...');

    // Find all clubs matching 'Orion' or 'Barcarena' (case insensitive not supported easily in SQLite/some DBs, usually contains)
    const clubs = await prisma.club.findMany({
        where: {
            OR: [
                { name: { contains: 'Orion', mode: 'insensitive' } },
                { name: { contains: 'Barcarena', mode: 'insensitive' } }
            ]
        },
        include: {
            _count: {
                select: { users: true }
            }
        }
    });

    console.log(`Found ${clubs.length} potential matches.`);

    // Group by similarity or just identifying "Orion de Barcarena" duplicates
    // Assuming duplicates are exact name or very close

    clubs.forEach(c => {
        console.log(`[${c.id}] ${c.name} - Members: ${c._count.users} - Created: ${c.createdAt}`);
    });

    // Strategy: Identify the "Winner" (most members or specific one)
    const targetName = 'Orion de Barcarena';
    const matches = clubs.filter(c => /orion/i.test(c.name));

    if (matches.length > 1) {
        console.log('Found duplicates for Orion! Deduplicating...');

        // Sort by member count descending
        matches.sort((a, b) => b._count.users - a._count.users);

        const winner = matches[0];
        console.log(`WINNER: ${winner.name} (${winner.id}) with ${winner._count.users} members.`);

        for (let i = 1; i < matches.length; i++) {
            const loser = matches[i];
            console.log(`DELETING duplicate: ${loser.name} (${loser.id}) - Members: ${loser._count.users}`);

            // Move members if needed? 
            // If loser has members, we should move them to winner.
            if (loser._count.users > 0) {
                console.log(`Moving ${loser._count.users} members from ${loser.id} to ${winner.id}...`);
                await prisma.user.updateMany({
                    where: { clubId: loser.id },
                    data: { clubId: winner.id }
                });
            }

            // Move Transactions, Events? (Cascade usually handles delete, but we want to KEEP data)
            // Ideally reassign everything.
            await prisma.transaction.updateMany({ where: { clubId: loser.id }, data: { clubId: winner.id } });
            await prisma.event.updateMany({ where: { clubId: loser.id }, data: { clubId: winner.id } });
            await prisma.product.updateMany({ where: { clubId: loser.id }, data: { clubId: winner.id } });

            // Now Delete
            await prisma.club.delete({ where: { id: loser.id } });
            console.log('Deleted.');
        }

        // Rename winner to EXACT target name if needed
        if (winner.name !== targetName) {
            await prisma.club.update({ where: { id: winner.id }, data: { name: targetName } });
            console.log(`Renamed winner to "${targetName}"`);
        }

    } else if (matches.length === 1) {
        if (matches[0].name !== targetName) {
            await prisma.club.update({ where: { id: matches[0].id }, data: { name: targetName } });
            console.log(`Renamed "${matches[0].name}" to "${targetName}"`);
        }
    }

    console.log('Done.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
