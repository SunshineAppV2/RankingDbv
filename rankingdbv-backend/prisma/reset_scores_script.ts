import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Iniciando o reset TOTAL de pontuação e histórico...');

    try {
        // 1. Apagar todo o histórico de pontos
        const deletedHistory = await prisma.pointHistory.deleteMany({});
        console.log(`✅ Histórico de Pontos apagado: ${deletedHistory.count} registros.`);

        // 2. Apagar logs de atividades (que geram pontos)
        const deletedLogs = await prisma.activityLog.deleteMany({});
        console.log(`✅ Logs de Atividades apagados: ${deletedLogs.count} registros.`);

        // 3. Zerar pontuação de TODOS os usuários
        const updatedUsers = await prisma.user.updateMany({
            data: { points: 0 }
        });
        console.log(`✅ Pontuação zerada para ${updatedUsers.count} usuários.`);

    } catch (error) {
        console.error('❌ Erro ao resetar pontuação:', error);
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
