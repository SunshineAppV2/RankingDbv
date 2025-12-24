import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class EventsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        private activitiesService: ActivitiesService
    ) { }

    async create(data: CreateEventDto) {
        let activityId: string | null = null;

        if (data.isScoring) {
            const activity = await this.activitiesService.create({
                title: `Evento: ${data.title}`,
                description: `Pontuação automática por participação no evento ${data.title}`,
                points: data.points || 50, // Default higher points for events
                clubId: data.clubId
            });
            activityId = activity.id;
        }

        return this.prisma.event.create({
            data: {
                ...data,
                activityId,
                isScoring: undefined, // Cleanup
                points: undefined     // Cleanup
            } as any
        });
    }

    async update(id: string, data: Partial<CreateEventDto>) {
        const existingEvent = await this.prisma.event.findUnique({ where: { id } });
        if (!existingEvent) throw new Error('Event not found');

        let activityId = existingEvent.activityId;

        // Handle isScoring (Create or Update Activity)
        if (data.isScoring) {
            const title = data.title || existingEvent.title;
            const description = `Pontuação automática por participação no evento ${title}`;
            const points = data.points || 50;

            if (!activityId) {
                // Create new activity
                const activity = await this.activitiesService.create({
                    title: `Evento: ${title}`,
                    description,
                    points,
                    clubId: existingEvent.clubId
                });
                activityId = activity.id;
            } else {
                // Update existing activity
                await this.prisma.activity.update({
                    where: { id: activityId },
                    data: {
                        title: `Evento: ${title}`,
                        description,
                        points
                    }
                });
            }
        }

        return this.prisma.event.update({
            where: { id },
            data: {
                ...data,
                activityId,
                isScoring: undefined,
                points: undefined
            } as any
        });
    }

    delete(id: string) {
        return this.prisma.event.delete({
            where: { id }
        });
    }

    findAll(clubId: string) {
        return this.prisma.event.findMany({
            where: { clubId },
            include: {
                registrations: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                                photoUrl: true
                            }
                        }
                    }
                }
            },
            orderBy: { startDate: 'asc' }
        });
    }

    async register(eventId: string, userIds: string[]) {
        // Create registrations for multiple users, ignoring duplicates
        const result = await this.prisma.$transaction(
            userIds.map(userId =>
                this.prisma.eventRegistration.upsert({
                    where: { userId_eventId: { userId, eventId } },
                    update: {},
                    create: { userId, eventId },
                    include: { event: true } // Include event for notification info
                })
            )
        );

        // Send notifications and Award Points
        for (const reg of result) {
            await this.notificationsService.send(
                reg.userId,
                'Nova Inscrição!',
                `Você foi inscrito no evento: ${reg.event.title}`,
                'INFO'
            );

            // Award Points if Activity Linked
            if (reg.event.activityId) {
                await this.activitiesService.awardPoints({
                    userId: reg.userId,
                    activityId: reg.event.activityId
                });
            }
        }

        return result;
    }

    async importEvents(file: Express.Multer.File, clubId: string) {
        console.log('--- Importing Events ---');
        console.log('Club ID:', clubId);
        if (!clubId) throw new BadRequestException('Club ID não fornecido');

        try {
            const XLSX = require('xlsx');
            const workbook = XLSX.read(file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Read raw rows first
            const rawRows = XLSX.utils.sheet_to_json(sheet);
            console.log(`Linhas encontradas: ${rawRows.length}`);

            if (rawRows.length === 0) {
                throw new BadRequestException('A planilha está vazia ou ilegível.');
            }

            // Helper to get value case-insensitive
            const getValue = (row: any, keys: string[]) => {
                const lowerKeys = keys.map(k => k.toLowerCase());
                for (const key of Object.keys(row)) {
                    if (lowerKeys.includes(key.toLowerCase())) return row[key];
                }
                return null;
            };

            const eventsToCreate = rawRows.map((row: any, index: number) => {
                // Try to find title and date with various common headers
                const title = getValue(row, ['Titulo', 'Título', 'Name', 'Nome', 'Event', 'Evento']);
                const rawDate = getValue(row, ['Data', 'DataInicio', 'Date', 'Start Date', 'Início']);
                const rawEndDate = getValue(row, ['DataFim', 'End Date', 'Fim', 'DataFinal']);
                const description = getValue(row, ['Descricao', 'Descrição', 'Description']);
                const location = getValue(row, ['Local', 'Location']);
                const costVal = getValue(row, ['Custo', 'Valor', 'Cost', 'Price']);

                if (!title) throw new Error(`Linha ${index + 2}: Coluna de Título não encontrada ou vazia.`);
                if (!rawDate) throw new Error(`Linha ${index + 2}: Coluna de Data não encontrada ou vazia.`);

                const parseDate = (val: any) => {
                    let d = new Date();
                    if (val) {
                        if (typeof val === 'string') {
                            val = val.trim();
                            // Handle dd/MM/yyyy
                            if (val.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
                                const [day, month, year] = val.split('/');
                                d = new Date(Number(year), Number(month) - 1, Number(day));
                            }
                            // Handle dd/MMM (Portuguese) e.g. "01/jan"
                            else if (val.match(/^\d{1,2}\/[a-zA-Z]{3}$/)) {
                                const [day, monthStr] = val.split('/');
                                const months: { [key: string]: number } = {
                                    'jan': 0, 'fev': 1, 'mar': 2, 'abr': 3, 'mai': 4, 'jun': 5,
                                    'jul': 6, 'ago': 7, 'set': 8, 'out': 9, 'nov': 10, 'dez': 11
                                };
                                const m = months[monthStr.toLowerCase().substring(0, 3)];
                                if (m !== undefined) {
                                    const year = new Date().getFullYear(); // Assume current/next year?
                                    // If month is earlier than current month, maybe next year? 
                                    // For simplicity, let's use 2026 as per context, or current year.
                                    // Let's default to CURRENT YEAR + 1 if we want to be safe for planning?? 
                                    // No, safer to use Current Year (2025). But user is planning 2026...
                                    // Let's use 2026 to match user context or 2025.
                                    // Ideally, we'd ask year. I'll default to 2026 since that's the current context.
                                    // Actually, let's just use 2026.
                                    d = new Date(2026, m, Number(day));
                                } else {
                                    d = new Date(val); // Try default parsing
                                }
                            } else {
                                d = new Date(val);
                            }
                        } else if (typeof val === 'number' || !isNaN(Number(val))) {
                            // Excel serial date
                            d = new Date((Number(val) - 25569) * 86400 * 1000);
                        } else {
                            d = new Date(val);
                        }
                    }
                    if (isNaN(d.getTime())) {
                        throw new Error(`Linha ${index + 2}: Data inválida (${val}). Use dd/mm/aaaa.`);
                    }
                    return d;
                };

                const startDate = parseDate(rawDate);
                const endDate = rawEndDate ? parseDate(rawEndDate) : startDate;

                return {
                    title: String(title),
                    startDate,
                    endDate,
                    description: description || '',
                    location: location || '',
                    cost: costVal ? (typeof costVal === 'string' ? parseFloat(costVal.replace(',', '.')) : Number(costVal)) : 0,
                    clubId
                };
            });

            console.log(`Criando ${eventsToCreate.length} eventos no banco...`);
            // Create strictly sequentially to avoid race conditions or timeouts ok big batches
            const createdEvents: any[] = [];
            for (const event of eventsToCreate) {
                const created = await this.prisma.event.create({ data: event });
                createdEvents.push(created);
            }

            return { imported: createdEvents.length };

        } catch (error) {
            console.error('Import Error:', error);
            // Pass original if it's already a BadRequestException
            if (error instanceof BadRequestException) throw error;
            // Wrap others
            throw new BadRequestException(`${error.message}`);
        }
    }

    async importRegistrations(eventId: string, file: Express.Multer.File) {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        const event = await this.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) throw new Error('Event not found');

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[]
        };

        const userIdsToRegister: string[] = [];

        for (const row of rows as any[]) {
            const identifier = row['Email'] || row['email'] || row['Nome'] || row['nome'] || row['Name'];
            if (!identifier) {
                results.skipped++;
                continue;
            }

            try {
                const user = await this.prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: identifier.toString().toLowerCase() },
                            { name: { equals: identifier.toString(), mode: 'insensitive' } }
                        ],
                        clubId: event.clubId
                    }
                });

                if (!user) {
                    results.errors.push(`Membro não encontrado: ${identifier} `);
                    continue;
                }

                userIdsToRegister.push(user.id);
            } catch (error) {
                results.errors.push(`Erro ao processar ${identifier}: ${error.message} `);
            }
        }

        if (userIdsToRegister.length > 0) {
            const registrationResult = await this.register(eventId, userIdsToRegister);
            results.success = registrationResult.length;
        }

        return results;
    }
    async updateAttendance(eventId: string, userIds: string[], attended: boolean) {
        const event = await this.prisma.event.findUnique({
            where: { id: eventId },
            include: { activity: true }
        });

        if (!event) throw new Error('Event not found');

        const results: any[] = [];

        // Transaction to ensure atomicity for each user is too complex for simple points, 
        // just iterate.
        for (const userId of userIds) {
            // 1. Update Registration
            const registration = await this.prisma.eventRegistration.update({
                where: { userId_eventId: { userId, eventId } },
                data: { attended }
            });

            // 2. Handle Points (Only if Attended = true)
            // If attended=false, we generally don't remove points automatically to avoid confusion, 
            // or we could implementing "Revoking" logic later.
            // For now, only ADD points.
            if (attended && event.activityId) {
                // Check if already logged to avoid duplicate points
                const existingLog = await this.prisma.activityLog.findFirst({
                    where: { userId, activityId: event.activityId }
                });

                if (!existingLog) {
                    await this.activitiesService.awardPoints({
                        userId,
                        activityId: event.activityId
                    });
                }
            }

            results.push(registration);
        }

        return results;
    }
}
