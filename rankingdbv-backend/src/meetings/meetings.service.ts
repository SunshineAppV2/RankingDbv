import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { AttendanceDto } from './dto/attendance.dto';
import { ActivitiesService } from '../activities/activities.service';

@Injectable()
export class MeetingsService {
    constructor(
        private prisma: PrismaService,
        private activitiesService: ActivitiesService
    ) { }

    async create(createMeetingDto: CreateMeetingDto) {
        console.log('Creating Meeting Payload:', createMeetingDto);

        let activityId: string | null = null;

        if (createMeetingDto.isScoring) {
            const activity = await this.activitiesService.create({
                title: `Reunião: ${createMeetingDto.title}`,
                description: `Pontuação automática por presença na reunião de ${new Date(createMeetingDto.date).toLocaleDateString()}`,
                points: createMeetingDto.points || 10,
                clubId: createMeetingDto.clubId
            });
            activityId = activity.id;
        }

        return this.prisma.meeting.create({
            data: {
                ...createMeetingDto,
                activityId,
                isScoring: undefined // Remove from prisma payload if not in schema (it's not)
            } as any // Cast avoiding strict checks on isScoring removal
        });
    }

    findAllByClub(clubId: string) {
        return this.prisma.meeting.findMany({
            where: { clubId },
            orderBy: { date: 'desc' },
            include: {
                _count: { select: { attendances: true } }
            }
        });
    }

    findOne(id: string) {
        return this.prisma.meeting.findUnique({
            where: { id },
            include: {
                attendances: true
            }
        });
    }

    async registerAttendance(meetingId: string, attendanceDto: AttendanceDto) {
        const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new Error('Meeting not found');

        return this.prisma.$transaction(async (tx) => {
            const results: string[] = [];

            for (const userId of attendanceDto.userIds) {
                const exists = await tx.attendance.findUnique({
                    where: { userId_meetingId: { userId, meetingId } }
                });

                if (!exists) {
                    // 1. Create Attendance Record
                    await tx.attendance.create({
                        data: {
                            userId,
                            meetingId,
                            status: 'PRESENT'
                        }
                    });

                    // 2. Award Points
                    if (meeting.activityId) {
                        // Use Activity Service (Generate Log + Points)
                        await this.activitiesService.awardPoints({
                            userId,
                            activityId: meeting.activityId
                        });
                    } else {
                        // Legacy/Simple Mode (Just Points, No Activity Log)
                        await tx.user.update({
                            where: { id: userId },
                            data: {
                                points: { increment: meeting.points },
                                pointsHistory: {
                                    create: {
                                        amount: meeting.points,
                                        reason: `Reunião: ${meeting.title}`,
                                        source: 'ATTENDANCE'
                                    }
                                }
                            }
                        });
                    }

                    results.push(userId);
                }
            }
            return { processed: results.length };
        });
    }

    async importMeetings(file: Express.Multer.File, clubId: string) {
        console.log('--- Importing Meetings ---');
        console.log('Club ID:', clubId);
        if (!clubId) throw new Error('Club ID não fornecido');

        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Linhas encontradas: ${rows.length}`);

        const meetingsToCreate = rows.map((row: any, index: number) => {
            const rawDate = row['Data'] || row['Date'];
            let parsedDate = new Date(); // Default now

            if (rawDate) {
                if (typeof rawDate === 'string' && rawDate.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                    const [day, month, year] = rawDate.split('/');
                    parsedDate = new Date(Number(year), Number(month) - 1, Number(day));
                }
                else if (typeof rawDate === 'number' || !isNaN(Number(rawDate))) {
                    const days = Number(rawDate);
                    // Excel serial date adjustment
                    parsedDate = new Date((days - 25569) * 86400 * 1000);
                }
                else {
                    parsedDate = new Date(rawDate);
                }
            }

            if (isNaN(parsedDate.getTime())) {
                console.warn(`Data inválida na linha ${index + 1}: ${rawDate}`);
                parsedDate = new Date();
            }

            return {
                title: row['Titulo'] || row['Título'] || row['Name'] || row['Nome'] || `Reunião Importada ${index + 1}`,
                date: parsedDate,
                type: row['Tipo'] || 'REGULAR',
                points: Number(row['Pontos']) || Number(row['Points']) || 10,
                clubId
            };
        });

        console.log(`Criando ${meetingsToCreate.length} reuniões no banco...`);
        return this.prisma.meeting.createMany({
            data: meetingsToCreate
        });
    }

    async importAttendance(meetingId: string, file: Express.Multer.File) {
        console.log('--- Importing Attendance ---');
        console.log('Meeting ID:', meetingId);

        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);
        console.log(`Linhas encontradas: ${rows.length}`);

        const meeting = await this.prisma.meeting.findUnique({ where: { id: meetingId } });
        if (!meeting) throw new Error('Meeting not found');

        const results = {
            success: 0,
            skipped: 0,
            errors: [] as string[]
        };

        for (const [index, row] of (rows as any[]).entries()) {
            const identifier = row['Email'] || row['email'] || row['Nome'] || row['nome'] || row['Name'];
            if (!identifier) {
                console.warn(`Identificador ausente na linha ${index + 1}`);
                results.skipped++;
                continue;
            }

            try {
                // Find user by email or exact name (case insensitive)
                const user = await this.prisma.user.findFirst({
                    where: {
                        OR: [
                            { email: identifier.toString().trim().toLowerCase() },
                            { name: { equals: identifier.toString().trim(), mode: 'insensitive' } }
                        ],
                        clubId: meeting.clubId
                    }
                });

                if (!user) {
                    console.warn(`Membro não encontrado: ${identifier}`);
                    results.errors.push(`Membro não encontrado na linha ${index + 1}: ${identifier}`);
                    continue;
                }

                // Register attendance using existing logic (points increment included)
                const attendance = await this.registerAttendance(meetingId, { userIds: [user.id] });
                if (attendance.processed > 0) {
                    results.success++;
                } else {
                    results.skipped++;
                }
            } catch (error) {
                console.error(`Erro ao processar linha ${index + 1}:`, error);
                results.errors.push(`Erro na linha ${index + 1} (${identifier}): ${error.message}`);
            }
        }

        console.log(`Importação finalizada. Sucesso: ${results.success}, Erros: ${results.errors.length}`);
        return results;
    }
}
