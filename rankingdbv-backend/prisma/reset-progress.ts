
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting reset of user progress...');

    // 1. Delete all User Requirements
    const deletedReqs = await prisma.userRequirement.deleteMany({});
    console.log(`Deleted ${deletedReqs.count} user requirements.`);

    // 2. Delete all User Specialties
    const deletedSpecs = await prisma.userSpecialty.deleteMany({});
    console.log(`Deleted ${deletedSpecs.count} user specialties.`);

    // 3. Reset User Points and Milestones
    const updatedUsers = await prisma.user.updateMany({
        data: {
            points: 0,
            lastClassMilestone: 0
        }
    });
    console.log(`Reset points and milestones for ${updatedUsers.count} users.`);

    // Optional: Reset Notifications?
    // const deletedNotifs = await prisma.notification.deleteMany({});
    // console.log(`Deleted ${deletedNotifs.count} notifications.`);

    console.log('Reset complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
