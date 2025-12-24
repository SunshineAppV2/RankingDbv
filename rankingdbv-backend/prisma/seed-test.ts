import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Test Data...');

    const password = await bcrypt.hash('123456', 10);

    // 1. Club
    const club = await prisma.club.upsert({
        where: { slug: 'master-club' },
        update: {},
        create: {
            name: 'Clube Master',
            slug: 'master-club',
            status: 'ACTIVE',
            planTier: 'PLAN_G'
        }
    });

    // 2. User with Points
    const user = await prisma.user.upsert({
        where: { email: 'test@rankingdbv.com' },
        update: {
            points: 5000, // Ensure enough points
            role: 'PATHFINDER'
        },
        create: {
            email: 'test@rankingdbv.com',
            name: 'Test Pathfinder',
            password,
            role: 'PATHFINDER',
            clubId: club.id,
            points: 5000
        },
    });

    // 3. Product
    const product = await prisma.product.create({
        data: {
            name: 'Camiseta Oficial',
            description: 'Camiseta do clube 2025',
            price: 300,
            stock: 10,
            category: 'REAL',
            clubId: club.id
        }
    });

    console.log('Created Test Data:');
    console.log('- User: test@rankingdbv.com / 123456 (5000 pts)');
    console.log('- Product:', product.name, '(300 pts)');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
