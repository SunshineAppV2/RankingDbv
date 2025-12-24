import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Iniciando recálculo de pontuação...');

    try {
        const users = await prisma.user.findMany({
            select: { id: true, name: true, clubId: true }
        });

        console.log(`📋 Encontrados ${users.length} usuários.`);

        let updatedCount = 0;

        for (const user of users) {
            // Calculate total points from history
            const aggregate = await prisma.pointHistory.aggregate({
                where: { userId: user.id },
                _sum: { amount: true }
            });

            const truePoints = aggregate._sum.amount || 0;

            // Update user
            await prisma.user.update({
                where: { id: user.id },
                data: { points: truePoints }
            });

            // console.log(`✅ ${user.name}: ${truePoints} pts`);
            updatedCount++;
        }

        console.log(`\n🎉 Sucesso! Pontuação recalculada para ${updatedCount} usuários.`);

    } catch (e) {
        console.error('❌ Erro:', e);
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
