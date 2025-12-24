
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { email: 'master@rankingdbv.com' },
        include: { club: true }
    });

    if (user) {
        console.log(`User: ${user.name}`);
        console.log(`ClubID: ${user.clubId}`);
        console.log(`ClubName: ${user.club?.name}`);
    } else {
        console.log('User not found.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
