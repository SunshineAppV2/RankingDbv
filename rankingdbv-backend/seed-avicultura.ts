import { PrismaClient, RequirementType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Start seeding Avicultura...');

    const existing = await prisma.specialty.findFirst({
        where: { name: 'Avicultura' }
    });

    if (existing) {
        console.log('Specialty Avicultura already exists. Skipping.');
        return;
    }

    const specialty = await prisma.specialty.create({
        data: {
            name: 'Avicultura',
            area: 'Estudo da Natureza',
            imageUrl: 'https://mda.wiki.br/w/images/thumb/7/77/Avicultura.jpg/280px-Avicultura.jpg', // Best guess URL or placeholder
            requirements: {
                create: [
                    { description: '1. Ter a especialidade de Aves domésticas.', type: 'TEXT' },
                    { description: '2. Identificar, por meio de imagens, e conhecer de forma geral o uso de: Incubadoras, Poleiros, Aviários, Bebedouros, Comedouros, Ninhos.', type: 'TEXT' },
                    { description: '3. Identificar ao vivo ou a partir de fotos, pelo menos, 2 raças das seguintes espécies, destacando sua respectiva aptidão (carne, ovos, penas e ou pele): Pato, Frango, Ganso, Codorna, Peru, Avestruz.', type: 'TEXT' },
                    { description: '4. Descrever um programa de alimentação para aves domésticas, desde a eclosão dos ovos até a fase adulta.', type: 'TEXT' },
                    { description: '5. Apresentar um relatório destacando os principais problemas de saúde que atingem as aves, apontando os sintomas e sinais, bem como preveni-los e tratá-los.', type: 'TEXT' },
                    { description: '6. Qual a temperatura, umidade e número de dias necessários para chocar os seguintes ovos: Pato, Frango, Ganso, Codorna, Peru, Avestruz.', type: 'TEXT' },
                    { description: '7. Ser capaz de examinar, testar e acondicionar ovos para o mercado e/ou para o consumo doméstico, descrever como discernir ovos podres dos ovos bons e saber como são classificados.', type: 'TEXT' },
                    { description: '8. Criar, até seu completo desenvolvimento, uma ninhada de, pelo menos, 6 aves de sua escolha.', type: 'TEXT' },
                    { description: '9. Apresentar um relatório escrito de, no mínimo, 300 palavras, ou oral de 5 minutos sobre a importância da avicultura e referir suas principais características.', type: 'TEXT' },
                    { description: '10. Visitar uma propriedade rural onde se pratica a criação de aves para uso próprio ou comércio e elaborar um relatório de, pelo menos, 300 palavras destacando as principais atividades ali desenvolvidas, bem como sobre a sua experiencia vivida para o cumprimento dos requisitos desta especialidade.', type: 'TEXT' }
                ]
            }
        }
    });

    console.log(`Created specialty with id: ${specialty.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
