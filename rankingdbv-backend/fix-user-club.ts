
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    // Find a club
    const club = await prisma.club.findFirst();

    if (!club) {
        console.log('Nenhum clube encontrado!');
        return;
    }

    console.log(`Clube encontrado: ${club.name} (${club.id})`);

    // Update user
    const user = await prisma.user.updateMany({
        where: { name: 'Desbravador 01' },
        data: { clubId: club.id }
    });

    console.log(`Usuários atualizados: ${user.count}`);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
