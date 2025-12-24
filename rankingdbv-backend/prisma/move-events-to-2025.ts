
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const events = await prisma.event.findMany({
        where: {
            title: { in: ['TREINAMENTO DOS OYMS UNB', 'RETIRO ESPIRITUAL', 'CONVENÇÃO JOVEM - MACRO 3'] }
        }
    });

    for (const evt of events) {
        const newStart = new Date(evt.startDate);
        newStart.setFullYear(2025);

        const newEnd = new Date(evt.endDate);
        newEnd.setFullYear(2025);

        await prisma.event.update({
            where: { id: evt.id },
            data: {
                startDate: newStart,
                endDate: newEnd
            }
        });
        console.log(`Updated ${evt.title} to 2025.`);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
