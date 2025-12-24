
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const clubId = '0001'; // Clube Águias da Colina

    const result = await prisma.user.updateMany({
        where: {}, // All users
        data: { clubId }
    });

    console.log(`Atualizados ${result.count} usuários para o clube ${clubId}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
