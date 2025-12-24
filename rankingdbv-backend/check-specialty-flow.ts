
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting Specialty Requirement Flow Test...');

    try {
        // 1. Create a Test Specialty with Requirements
        console.log('1. Creating Specialty with Requirements...');
        const specialty = await prisma.specialty.create({
            data: {
                name: 'Especialidade de Teste ' + Date.now(),
                area: 'Teste',
                requirements: {
                    create: [
                        { description: 'Requirement 1 (Text)', type: 'TEXT' },
                        { description: 'Requirement 2 (File)', type: 'FILE' }
                    ]
                }
            },
            include: { requirements: true }
        });
        console.log('Created Specialty:', specialty.id, specialty.requirements.length, 'requirements');

        // 2. Create a Test User
        console.log('2. Creating Test User...');
        const user = await prisma.user.create({
            data: {
                email: `testuser${Date.now()}@test.com`,
                password: 'password123',
                name: 'Test Pathfinder',
                role: 'PATHFINDER'
            }
        });
        console.log('Created User:', user.id);

        // 3. Submit Answers
        console.log('3. Submitting Answers...');
        const req1 = specialty.requirements.find(r => r.type === 'TEXT');
        const req2 = specialty.requirements.find(r => r.type === 'FILE');

        if (req1) {
            await prisma.userRequirement.create({
                data: {
                    userId: user.id,
                    requirementId: req1.id,
                    status: 'PENDING',
                    answerText: 'Minha resposta de texto',
                    completedAt: new Date()
                }
            });
            console.log('Answer 1 submitted.');
        }

        if (req2) {
            await prisma.userRequirement.create({
                data: {
                    userId: user.id,
                    requirementId: req2.id,
                    status: 'PENDING',
                    answerFileUrl: 'http://example.com/file.pdf',
                    completedAt: new Date()
                }
            });
            console.log('Answer 2 submitted.');
        }

        // Verify answers in DB
        const userReqs = await prisma.userRequirement.findMany({ where: { userId: user.id } });
        console.log('Found', userReqs.length, 'user requirements submitted.');

        // 4. Approve Specialty
        console.log('4. Approving Specialty...');
        // Simulate what the service `approveSpecialty` does

        // Check points before
        const userBefore = await prisma.user.findUnique({ where: { id: user.id } });
        console.log('Points before:', userBefore?.points);

        // Create UserSpecialty relation as COMPLETED
        await prisma.userSpecialty.create({
            data: {
                userId: user.id,
                specialtyId: specialty.id,
                status: 'COMPLETED',
                awardedAt: new Date()
            }
        });

        // Award Points
        await prisma.user.update({
            where: { id: user.id },
            data: { points: { increment: 250 } }
        });

        const userAfter = await prisma.user.findUnique({ where: { id: user.id } });
        console.log('Points after:', userAfter?.points);

        if (userAfter?.points === (userBefore?.points || 0) + 250) {
            console.log('SUCCESS: Points awarded correctly.');
        } else {
            console.error('FAILURE: Points not awarded correctly.');
        }

    } catch (e) {
        console.error('Error during test:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
