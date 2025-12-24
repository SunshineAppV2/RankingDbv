import { PrismaClient } from '@prisma/client';
import { SpecialtiesService } from './src/specialties/specialties.service';
import { NotificationsService } from './src/notifications/notifications.service';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './src/prisma/prisma.service';

// Mock Notification Service to avoid mailer issues in script
const mockNotificationsService = {
    send: async () => true,
};

async function main() {
    console.log('--- Verifying Approval Flow Logic ---');

    const prisma = new PrismaClient();

    // We need to instantiate the service to test the exact logic (including the side-effect of checkSpecialtyCompletion)
    // Or we can just use Prisma to manipulate and check, but using the Service is better to test the actual code.
    // However, instantiating NestJS standalone app context is heavy. 
    // Let's manually replicate the "Admin Action" using prisma updates similar to what the controller would do,
    // OR try to invoke the service method if we can easily instantiate it.

    // Simplest approach: Use Prisma to mimic the Controller's intent check if the data responds as expected?
    // No, the logic "checkSpecialtyCompletion" is INSIDE the service. We MUST test the service method.

    // Let's try to construct the Service manually.
    const service = new SpecialtiesService(
        prisma as any, // Cast to any to avoid strict type issues with the real NestJS PrismaService wrapper vs raw PrismaClient
        mockNotificationsService as any
    );

    // 1. Find the Pending Requirement (from previous setup)
    const pendingReq = await prisma.userRequirement.findFirst({
        where: { status: 'PENDING' },
        include: { requirement: true }
    });

    if (!pendingReq) {
        console.error('❌ FAIL: No pending requirement found. Run setup-approval-test.ts first.');
        return;
    }

    console.log(`FOUND Pending Requirement: ReqID=${pendingReq.requirementId}, UserID=${pendingReq.userId}`);

    // 2. Simulate Admin Approving Logic
    console.log('ACTION: Calling setRequirementStatus(APPROVED)...');

    // Note: We need to bind the checkSpecialtyCompletion context if it uses `this`. 
    // Since we instantiated the class, `this` should work.

    try {
        const result = await service.setRequirementStatus(pendingReq.userId, pendingReq.requirementId, 'APPROVED');
        console.log('Current Status:', result.status);

        if (result.status !== 'APPROVED') {
            console.error('❌ FAIL: Status did not update to APPROVED.');
        } else {
            console.log('✅ PASS: Requirement Status updated to APPROVED.');
        }

        // 3. Check Side Effects (Specialty Completion?)
        // Let's see if the logic for "All requirements approved -> Specialty Waiting/Completed" triggered.
        // First, does this specialty have other requirements?
        const specialtyId = pendingReq.requirement.specialtyId;
        if (specialtyId) {
            const allReqs = await prisma.requirement.count({ where: { specialtyId } });
            const approvedReqs = await prisma.userRequirement.count({
                where: {
                    userId: pendingReq.userId,
                    requirement: { specialtyId },
                    status: 'APPROVED'
                }
            });

            console.log(`Specialty Progress: ${approvedReqs}/${allReqs} requirements approved.`);

            if (approvedReqs === allReqs) {
                const userSpecialty = await prisma.userSpecialty.findUnique({
                    where: { userId_specialtyId: { userId: pendingReq.userId, specialtyId } }
                });

                if (userSpecialty?.status === 'WAITING_APPROVAL' || userSpecialty?.status === 'COMPLETED') {
                    console.log(`✅ PASS: Specialty Status updated to ${userSpecialty.status}`);
                } else {
                    console.log(`⚠️ INFO: Specialty Status is ${userSpecialty?.status || 'null'}. (Maybe logic only sets WAITING_APPROVAL, check expected behavior)`);
                }
            }
        }

    } catch (err) {
        console.error('❌ FAIL: Error executing service method:', err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
