import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting E2E Setup...');

    // 1. Ensure a Club exists
    let club = await prisma.club.findFirst();
    if (!club) {
        club = await prisma.club.create({
            data: { name: 'Clube de Teste' }
        });
        console.log('Created Club:', club.name);
    }

    // 2. Upsert Unit
    const unit = await prisma.unit.upsert({
        where: { id: 'e2e-unit-id' }, // Using a specific ID if possible, or we search by name
        update: {},
        create: {
            name: 'Unidade Alpha',
            clubId: club.id
        }
    }).catch(async () => {
        // Fallback if ID is uuid and cannot be hardcoded easily, search by name
        const existing = await prisma.unit.findFirst({ where: { name: 'Unidade Alpha' } });
        if (existing) return existing;
        return prisma.unit.create({ data: { name: 'Unidade Alpha', clubId: club.id } });
    });
    console.log('Unit Ready:', unit.name);

    // 3. Upsert Counselor User
    const hashedPassword = await bcrypt.hash('123456', 10);
    const counselorEmail = 'counselor@test.com';

    const counselor = await prisma.user.upsert({
        where: { email: counselorEmail },
        update: {
            role: 'COUNSELOR',
            unitId: unit.id,
            clubId: club.id,
            password: hashedPassword // Ensure password is set if existed
        },
        create: {
            name: 'Conselheiro Teste',
            email: counselorEmail,
            password: hashedPassword,
            role: 'COUNSELOR',
            clubId: club.id,
            unitId: unit.id,
        }
    });
    console.log('Counselor Ready:', counselor.email);

    // 4. Upsert Pathfinder User (Member of the Unit)
    const memberEmail = 'member@test.com';
    await prisma.user.upsert({
        where: { email: memberEmail },
        update: {
            unitId: unit.id,
            clubId: club.id
        },
        create: {
            name: 'Desbravador Alpha',
            email: memberEmail,
            password: hashedPassword,
            role: 'PATHFINDER',
            clubId: club.id,
            unitId: unit.id
        }
    });
    console.log('Member Ready:', memberEmail);

    console.log('E2E Setup Complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
