import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const admin = await prisma.user.findFirst({
        where: {
            role: { in: ['OWNER', 'ADMIN', 'INSTRUCTOR'] },
            club: { name: 'Clube Master' } // Target the test club
        }
    });

    if (admin) {
        console.log(`ADMIN_EMAIL=${admin.email}`);
        console.log(`ADMIN_NAME=${admin.name}`);
    } else {
        console.log('No admin found for Clube Master.');
        const anyAdmin = await prisma.user.findFirst({
            where: { role: { in: ['OWNER', 'ADMIN', 'INSTRUCTOR'] } }
        });
        if (anyAdmin) {
            console.log(`FALLBACK_ADMIN_EMAIL=${anyAdmin.email}`);
        }
    }
}

main().finally(() => prisma.$disconnect());
