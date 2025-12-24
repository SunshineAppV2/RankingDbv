
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        select: { email: true, clubId: true }
    });
    console.log('USERS:', JSON.stringify(users, null, 2));

    const events = await prisma.event.findMany({
        select: { title: true, startDate: true, clubId: true },
        orderBy: { createdAt: 'desc' },
        take: 5
    });
    console.log('EVENTS (Last 5):', JSON.stringify(events, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
