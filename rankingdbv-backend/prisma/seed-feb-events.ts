
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding events...');

    // 1. Find the Club (assuming the first one or a specific one if known)
    // In a real scenario, we might want to specify the club slug or ID.
    // For now, we'll take the first one found.
    const club = await prisma.club.findFirst();

    if (!club) {
        console.error('No club found to add events to.');
        return;
    }

    console.log(`Adding events to Club: ${club.name} (${club.id})`);

    // Events Data (Year 2026 - Next one relative to Dec 2025)
    // If user meant 2025 (past), they can edit.
    const YEAR = 2026;

    const events = [
        {
            title: 'TREINAMENTO DOS OYMS UNB',
            startDate: new Date(`${YEAR}-02-01T12:00:00Z`), // 01 A 08
            endDate: new Date(`${YEAR}-02-08T12:00:00Z`),
            description: 'Treinamento dos OYMS UNB',
            location: 'Local a definir',
            cost: 0,
            isScoring: false // Explicitly requested "sem pontuação"
        },
        {
            title: 'RETIRO ESPIRITUAL',
            startDate: new Date(`${YEAR}-02-13T12:00:00Z`), // 13 A 17
            endDate: new Date(`${YEAR}-02-17T12:00:00Z`),
            description: 'Retiro Espiritual de Carnaval',
            location: 'Local a definir',
            cost: 0,
            isScoring: false
        },
        {
            title: 'CONVENÇÃO JOVEM - MACRO 3',
            startDate: new Date(`${YEAR}-02-28T12:00:00Z`), // 28
            endDate: new Date(`${YEAR}-02-28T12:00:00Z`),
            description: 'Convenção Jovem - Macro 3',
            location: 'Local a definir',
            cost: 0,
            isScoring: false
        }
    ];

    for (const evt of events) {
        // Check if exists to avoid dupes? 
        // For simplicity, just create.
        const created = await prisma.event.create({
            data: {
                title: evt.title,
                startDate: evt.startDate,
                endDate: evt.endDate,
                description: evt.description,
                location: evt.location,
                cost: evt.cost,
                clubId: club.id,
                // activityId is null by default, effectively "sem pontuação"
            }
        });
        console.log(`Created event: ${created.title} (ID: ${created.id})`);
    }

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
