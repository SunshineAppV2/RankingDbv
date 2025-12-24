
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const mapping: Record<string, string> = {
    'Geral': 'I.GERAIS',
    'Descoberta Espiritual': 'II. DESCOBERTA ESPIRITUAL',
    'Servindo a Outros': 'III. SERVINDO A OUTROS',
    'Desenvolvendo Amizade': 'IV. DESENVOLVENDO AMIZADE',
    'Saúde e Aptidão Física': 'V. SAÚDE E APTIDÃO FÍSICA',
    'Organização e Liderança': 'VI. ORGANIZAÇÃO E LIDERANÇA',
    'Estudo da Natureza': 'VII. ESTUDO DA NATUREZA',
    'Arte de Acampar': 'VIII. ARTE DE ACAMPAR',
    'Estilo de Vida': 'IX. ESTILO DE VIDA',
    'Classe Avançada': 'X. CLASSE AVANÇADA'
};

async function main() {
    console.log('Updating Areas...');

    for (const [oldArea, newArea] of Object.entries(mapping)) {
        const result = await prisma.requirement.updateMany({
            where: { area: oldArea },
            data: { area: newArea }
        });
        console.log(`Updated ${result.count} requirements from "${oldArea}" to "${newArea}"`);
    }

    // Also handle requirements that might have been "Geral" but were actually "GERAL" etc.
    // And check if there are any AMIGO requirements with null area that should be GERAL.

    console.log('Update complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
