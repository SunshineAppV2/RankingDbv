
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubId = 'c4f6d951-eaa8-457a-930a-d2dcae5bd556'; // SUNSHINE
    const dateInput = '2025-12-25'; // Simulating HTML5 date input

    console.log(`Creating meeting for Club: ${clubId} with date: ${dateInput}`);

    try {
        const meeting = await prisma.meeting.create({
            data: {
                title: 'Reunião de Natal',
                type: 'SPECIAL',
                points: 50,
                clubId: clubId,
                date: new Date(dateInput) // This logic matches the service
            }
        });

        console.log(`SUCCESS: Created Meeting [${meeting.id}]`);
        console.log(`Saved Date: ${meeting.date.toISOString()}`);
    } catch (error) {
        console.error('ERROR creating meeting:', error);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
