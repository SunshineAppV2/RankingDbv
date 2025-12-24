
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createMasterUser() {
    const email = 'master@rankingdbv.com.br';
    const password = '123456';
    const name = 'Master User';

    // 1. Check if user exists
    const existingUser = await prisma.user.findUnique({
        where: { email },
    });

    if (existingUser) {
        console.log('User already exists. Updating role to OWNER and resetting password...');
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({
            where: { email },
            data: {
                role: 'MASTER',
                password: hashedPassword
            }
        });
        console.log('User updated successfully.');
        return;
    }

    // 2. Create Club if not exists (or create a new one for master)
    // We'll create a dedicated "Clube Master"
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
                planTier: 'PLAN_G'
            }
        });
    }

    // 3. Create User
    console.log('Creating Master User...');
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            email,
            name,
            password: hashedPassword,
            role: 'MASTER',
            clubId: club.id
        }
    });
    // Optional: Add unitId if necessary, or leave null for Owner

    console.log('Master User created successfully:');
    console.log({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        club: club.name
    });
}

createMasterUser()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
