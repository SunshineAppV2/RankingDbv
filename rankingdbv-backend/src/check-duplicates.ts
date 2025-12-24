
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubs = await prisma.club.findMany({
        select: { id: true, name: true, region: true }
    });

    console.log('Total Clubs:', clubs.length);
    const nameCounts: Record<string, number> = {};
    clubs.forEach(c => {
        nameCounts[c.name] = (nameCounts[c.name] || 0) + 1;
    });

    Object.entries(nameCounts).filter(([_, count]) => count > 1).forEach(([name, count]) => {
        console.log(`Duplicate Club: "${name}" - Count: ${count}`);
        const duplicates = clubs.filter(c => c.name === name);
        console.log(duplicates);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
