
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Restoring Master Access...');

    // 1. Ensure Master Club exists
    const club = await prisma.club.upsert({
        where: { slug: 'master-club' },
        update: {}, // Don't change name if exists
        create: {
            name: 'Clube Master',
            slug: 'master-club',
            status: 'ACTIVE',
            planTier: 'PLAN_G'
        }
    });

    // 2. Force Update Master User
    const masterEmail = 'master@rankingdbv.com';
    const user = await prisma.user.findUnique({ where: { email: masterEmail } });

    // Always set role to OWNER and clubId to Master Club
    if (user) {
        await prisma.user.update({
            where: { email: masterEmail },
            data: {
                role: 'OWNER',
                clubId: club.id
            }
        });
        console.log(`Updated existing user ${masterEmail} to OWNER and Club ${club.id}`);
    } else {
        // Create if missing
        const password = await bcrypt.hash('123456', 10);
        await prisma.user.create({
            data: {
                email: masterEmail,
                name: 'Master Admin',
                password,
                role: 'OWNER',
                clubId: club.id
            }
        });
        console.log(`Created new user ${masterEmail}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
