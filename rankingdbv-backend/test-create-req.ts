
import { PrismaClient, DBVClass } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Testing Requirement Creation...');

    try {
        const req = await prisma.requirement.create({
            data: {
                description: 'Requisito de Teste',
                code: 'T-01',
                dbvClass: 'AMIGO'
            }
        });
        console.log('Requirement Created:', req);
    } catch (error) {
        console.error('Error creating requirement:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
