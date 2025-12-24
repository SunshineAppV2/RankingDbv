
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const AREA_MAPPING: Record<string, string> = {
    'Geral': 'I. GERAIS',
    'Descoberta Espiritual': 'II. DESCOBERTA ESPIRITUAL',
    'Servindo a Outros': 'III. SERVINDO A OUTROS',
    'Desenvolvendo Amizade': 'IV. DESENVOLVENDO AMIZADE',
    'Saúde e Aptidão Física': 'V. SAÚDE E APTIDÃO FÍSICA',
    'Desenvolvendo Organização e Liderança': 'VI. ORGANIZAÇÃO E LIDERANÇA',
    'Estudo da Natureza': 'VII. ESTUDO DA NATUREZA',
    'Arte de Acampar': 'VIII. ARTE DE ACAMPAR',
    'Estilo de Vida': 'IX. ESTILO DE VIDA',
    'Estilo de Vida Class': 'IX. ESTILO DE VIDA', // Handle potential typo/legacy
    'Classe Avançada': 'X. CLASSE AVANÇADA'
};

async function main() {
    console.log('Starting Requirement Area Migration...');

    const requirements = await prisma.requirement.findMany();
    console.log(`Found ${requirements.length} requirements.`);

    let updatedCount = 0;

    for (const req of requirements) {
        if (!req.area) continue;

        // Try exact match
        let newArea = AREA_MAPPING[req.area];

        // Try loose match (case insensitive or partial) if not found
        if (!newArea) {
            const key = Object.keys(AREA_MAPPING).find(k =>
                req.area!.toLowerCase().includes(k.toLowerCase()) ||
                k.toLowerCase().includes(req.area!.toLowerCase())
            );
            if (key) newArea = AREA_MAPPING[key];
        }

        if (newArea && newArea !== req.area) {
            await prisma.requirement.update({
                where: { id: req.id },
                data: { area: newArea }
            });
            console.log(`Updated: "${req.area}" -> "${newArea}"`);
            updatedCount++;
        }
    }

    console.log(`Migration Complete. Updated ${updatedCount} requirements.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
