
import { PrismaClient, RequirementStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying UserRequirement persistence...');

    // 1. Get a user
    const user = await prisma.user.findFirst();
    if (!user) {
        console.error('No user found to test with.');
        return;
    }
    console.log('Test User:', user.name, user.id);

    // 2. Get a requirement
    const requirement = await prisma.requirement.findFirst();
    if (!requirement) {
        console.error('No requirement found. Please seed specialties/requirements first.');
        return;
    }
    console.log('Test Requirement:', requirement.id, requirement.description);

    // 3. Create/Upsert UserRequirement
    console.log('Attempting to save answer...');
    const answer = await prisma.userRequirement.upsert({
        where: {
            userId_requirementId: { userId: user.id, requirementId: requirement.id }
        },
        create: {
            userId: user.id,
            requirementId: requirement.id,
            status: RequirementStatus.PENDING,
            answerText: 'Test answer from script',
            completedAt: new Date()
        },
        update: {
            answerText: 'Updated test answer from script ' + new Date().toISOString(),
            completedAt: new Date()
        }
    });

    console.log('Answer saved successfully:', answer);

    // 4. Verify read
    const saved = await prisma.userRequirement.findUnique({
        where: { userId_requirementId: { userId: user.id, requirementId: requirement.id } }
    });

    if (saved && saved.answerText?.includes('Test answer')) {
        console.log('VERIFICATION PASSED: Data persisted to DB.');
    } else {
        console.error('VERIFICATION FAILED: Data not found or incorrect.');
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
