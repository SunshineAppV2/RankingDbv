
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // 1. Get the user's clubId (assuming 'diretor@aguias.com' or checking all users)
    const user = await prisma.user.findFirst({
        where: { email: 'diretor@aguias.com' } // Adjust if user is different, but based on previous logs this is it
    });

    if (!user) {
        console.log('User not found');
        return;
    }

    console.log(`User Club ID: ${user.clubId}`);

    if (!user.clubId) {
        console.log('User has no club');
        return;
    }

    // 2. Perform the exact query used by EventsService.findAll
    const events = await prisma.event.findMany({
        where: { clubId: user.clubId },
        orderBy: { startDate: 'asc' }
    });

    console.log(`Found ${events.length} events for this club.`);

    // 3. Filter for Feb 2026 (mimic frontend logic)
    const feb2026Events = events.filter(e => {
        const d = new Date(e.startDate);
        // Log the date parsing
        console.log(`Event: ${e.title} | Raw: ${e.startDate.toISOString()} | Month: ${d.getMonth()} | Year: ${d.getFullYear()}`);
        return d.getMonth() === 1 && d.getFullYear() === 2026; // Month is 0-indexed (1 = Feb)
    });

    console.log(`Events visible in Feb 2026: ${feb2026Events.length}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
