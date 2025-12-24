
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const totalSpecialties = await prisma.specialty.count();
    const totalRequirements = await prisma.requirement.count();
    const specialtiesWithReqs = await prisma.specialty.count({
        where: { requirements: { some: {} } }
    });

    console.log(`Total Specialties: ${totalSpecialties}`);
    console.log(`Total Requirements: ${totalRequirements}`);
    console.log(`Specialties with Requirements: ${specialtiesWithReqs}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
