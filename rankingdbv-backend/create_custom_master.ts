
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createCustomMasterUser() {
    const email = 'master@cantinhodbv.com';
    const password = 'Ascg@300585!@#$';
    const name = 'Master User';

    // 1. Check if user exists (by email)
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    if (existingUser) {
        console.log(`User ${email} already exists. Updating credentials...`);
        await prisma.user.update({
            where: { email },
            data: {
                role: 'MASTER',
                password: hashedPassword
            }
        });
        console.log('User updated successfully.');
    } else {
        // Check if there is ANY master user to overwrite/upgrade?
        // Or just create new.
        // Let's create a "Clube Master" first if needed.
        const clubName = 'Clube Master';
        let club = await prisma.club.findFirst({
            where: { name: clubName }
        });

        if (!club) {
            console.log('Creating Master Club...');
            club = await prisma.club.create({
                data: {
                    name: clubName,
                    status: 'ACTIVE',
                    planTier: 'PLAN_G',
                    region: 'Master',
                    union: 'Master',
                    mission: 'Master'
                }
            });
        }

        console.log(`Creating new Master User: ${email}`);
        await prisma.user.create({
            data: {
                email,
                name,
                password: hashedPassword,
                role: 'MASTER',
                clubId: club.id
            }
        });
        console.log('User created successfully.');
    }
}

createCustomMasterUser()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
