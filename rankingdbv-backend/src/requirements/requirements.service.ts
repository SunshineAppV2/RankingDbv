
import { Injectable, Inject, forwardRef, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRequirementDto } from './dto/create-requirement.dto';
import { UpdateRequirementDto } from './dto/update-requirement.dto';

import { NotificationsService } from '../notifications/notifications.service';
import { ClubsService } from '../clubs/clubs.service';
import * as cheerio from 'cheerio';
import axios from 'axios';

@Injectable()
export class RequirementsService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService,
        @Inject(forwardRef(() => ClubsService)) private clubsService: ClubsService
    ) { }

    async create(data: CreateRequirementDto) {
        console.log('[RequirementsService] Creating requirement:', JSON.stringify(data));
        const { questions, ...rest } = data;
        try {
            return await this.prisma.requirement.create({
                data: {
                    ...rest,
                    questions: questions ? {
                        create: questions
                    } : undefined
                }
            });
        } catch (error) {
            console.error('[RequirementsService] Error creating requirement:', error);
            throw error;
        }
    }

    async scrapeUrl(url: string): Promise<any[]> {
        console.log(`[Scraper] Fetching URL: ${url}`);
        try {
            const { data } = await axios.get(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            const $ = cheerio.load(data);
            const requirements: any[] = [];
            let currentArea = 'GERAIS';

            // Extract text from body
            const text = $('body').text();
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

            let isParsing = false;

            const areaRegex = /^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+(.+)$/i;
            const reqRegex = /^(\d+)\.\s+(.+)$/;

            for (const line of lines) {
                // Start parsing when we see "REQUISITOS"
                if (line.toUpperCase().includes('REQUISITOS')) {
                    isParsing = true;
                    continue;
                }
                // Or if we identify an Area title
                if (areaRegex.test(line)) {
                    isParsing = true;
                }

                if (!isParsing) continue;

                const areaMatch = line.match(areaRegex);
                if (areaMatch) {
                    currentArea = areaMatch[2].trim().toUpperCase();
                    continue;
                }

                const reqMatch = line.match(reqRegex);
                if (reqMatch) {
                    const code = reqMatch[1];
                    const description = reqMatch[2];
                    // Add new requirement
                    requirements.push({
                        code: code,
                        area: currentArea,
                        description: description,
                        // active: true - Removed as it's not in Prisma Schema
                        dbvClass: 'AMIGO' // Placeholder, overwritten below
                    });
                } else {
                    // Check for sub-items like "a) ..." or continues text
                    if (requirements.length > 0) {
                        if (/^[a-z]\)\s/.test(line)) {
                            requirements[requirements.length - 1].description += '\n' + line;
                        }
                    }
                }

                // Stop condition for Class Avançada or similar sections if needed
                if (line.includes('CLASSE AVANÇADA')) {
                    currentArea = 'CLASSE AVANÇADA';
                }
            }

            // Detect Class from Titie
            const title = $('title').text().toUpperCase() || $('h1').text().toUpperCase();
            let dbvClass = 'AMIGO';
            if (title.includes('AMIGO')) dbvClass = 'AMIGO';
            else if (title.includes('COMPANHEIRO')) dbvClass = 'COMPANHEIRO';
            else if (title.includes('PESQUISADOR')) dbvClass = 'PESQUISADOR';
            else if (title.includes('PIONEIRO')) dbvClass = 'PIONEIRO';
            else if (title.includes('EXCURSIONISTA')) dbvClass = 'EXCURSIONISTA';
            else if (title.includes('GUIA')) dbvClass = 'GUIA';

            return requirements.map(r => ({ ...r, dbvClass }));
        } catch (error) {
            console.error('Error scraping URL:', error);
            throw new Error('Falha ao ler URL. Verifique se o link está correto.');
        }
    }

    async createMany(data: CreateRequirementDto[]) {
        console.log(`[RequirementsService] Importing ${data.length} requirements...`);
        let count = 0;
        const errors: any[] = [];
        for (const item of data) {
            try {
                await this.create(item);
                count++;
            } catch (err) {
                console.error('Error importing requirement:', item.code, err);
                errors.push({ code: item.code, error: err.message });
            }
        }
        console.log(`[RequirementsService] Imported ${count}/${data.length} requirements.`);
        return { count, errors };
    }

    findAll(query: { dbvClass?: any, specialtyId?: string, userId?: string, userClubId?: string }) {
        const where: any = {};
        if (query.dbvClass) where.dbvClass = query.dbvClass;
        if (query.specialtyId) where.specialtyId = query.specialtyId;

        // Filter by Club (Global + User's Club)
        // If userClubId is provided, we fetch Global AND Club's requirements.
        // If not, we might be fetching only Global or All (depends on context, usually Global only for public).
        if (query.userClubId) {
            where.OR = [
                { clubId: null },
                { clubId: query.userClubId }
            ];
        } else {
            // If no user context, show only GLOBAL Requirements to be safe?
            // Or show all if it's a Super Admin listing? 
            // Let's assume for now: If no clubId provided in query, show ONLY Global.
            where.clubId = null;
        }

        return this.prisma.requirement.findMany({
            where,
            orderBy: [
                { area: 'asc' },
                { code: 'asc' },
                { description: 'asc' }
            ],
            include: {
                userProgress: query.userId ? {
                    where: { userId: query.userId },
                    select: { status: true, answerText: true, answerFileUrl: true }
                } : false
            }
        });
    }

    // Toggle status (Pending <-> Completed)
    async toggleStatus(userId: string, requirementId: string) {
        const existing = await this.prisma.userRequirement.findUnique({
            where: { userId_requirementId: { userId, requirementId } }
        });

        if (!existing) {
            // Create if not exists (Auto-assign on self-toggle? Allowed for basic requirements)
            return this.prisma.userRequirement.create({
                data: {
                    userId,
                    requirementId,
                    status: 'APPROVED',
                    completedAt: new Date()
                }
            });
        }

        if (existing.status === 'APPROVED') {
            // Revert to PENDING (Un-complete)
            return this.prisma.userRequirement.update({
                where: { id: existing.id },
                data: { status: 'PENDING', completedAt: null }
            });
        } else {
            // Mark as APPROVED (Complete)
            return this.prisma.userRequirement.update({
                where: { id: existing.id },
                data: { status: 'APPROVED', completedAt: new Date() }
            });
        }
    }

    // Get User Progress
    async getUserProgress(userId: string) {
        return this.prisma.userRequirement.findMany({
            where: { userId }
        });
    }

    async remove(id: string) {
        return this.prisma.requirement.delete({
            where: { id }
        });
    }

    async update(id: string, updateDto: UpdateRequirementDto) {
        const { questions, ...rest } = updateDto;

        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.requirement.update({
                where: { id },
                data: rest
            });

            if (rest.type === 'QUESTIONNAIRE' && questions) {
                // Remove old questions and add new ones
                await tx.question.deleteMany({ where: { requirementId: id } });
                await tx.question.createMany({
                    data: questions.map(q => ({
                        ...q,
                        requirementId: id
                    }))
                });
            }

            return updated;
        });
    }

    // Submit Answer for Requirement
    async submitAnswer(userId: string, requirementId: string, text?: string, fileUrl?: string) {
        // Upsert Answer
        // Enforce Assignment Check
        const existing = await this.prisma.userRequirement.findUnique({
            where: { userId_requirementId: { userId, requirementId } }
        });

        if (!existing) {
            throw new Error('Este requisito não foi atribuído a você.');
        }

        const result = await this.prisma.userRequirement.update({
            where: { id: existing.id },
            data: {
                answerText: text,
                answerFileUrl: fileUrl,
                status: 'PENDING',
                completedAt: new Date()
            }
        });

        // Notify Admins
        try {
            const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, clubId: true } });
            const requirement = await this.prisma.requirement.findUnique({ where: { id: requirementId }, select: { description: true, code: true } });

            if (user && user.clubId && requirement) {
                const admins = await this.prisma.user.findMany({
                    where: {
                        clubId: user.clubId,
                        role: { in: ['OWNER', 'ADMIN', 'INSTRUCTOR'] }
                    },
                    select: { id: true }
                });

                for (const admin of admins) {
                    await this.notificationsService.send(
                        admin.id,
                        'Nova Aprovação Pendente',
                        `${user.name} enviou uma resposta para o requisito: ${requirement.code ? requirement.code + ' - ' : ''}${requirement.description.substring(0, 30)}...`,
                        'INFO'
                    );
                }
            }
        } catch (error) {
            console.error('Failed to send notifications on submit:', error);
        }

        return result;
    }

    // --- QUESTIONNAIRE LOGIC ---

    async getQuiz(requirementId: string) {
        // Fetch all questions for the requirement
        const questions = await this.prisma.question.findMany({
            where: { requirementId }
        });

        // Shuffle and pick 3
        const shuffled = questions.sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);

        // Map to return without correct answer for security (though options are checked on backend)
        return selected.map(q => ({
            id: q.id,
            questionText: q.questionText,
            options: q.options
        }));
    }

    async submitQuiz(userId: string, requirementId: string, answers: { questionId: string, selectedIndex: number }[]) {
        // Fetch questions to verify
        const questionIds = answers.map(a => a.questionId);
        const questions = await this.prisma.question.findMany({
            where: { id: { in: questionIds }, requirementId }
        });

        // Verify answers
        let isPass = true;
        if (questions.length !== answers.length) isPass = false; // Missing answers?

        for (const q of questions) {
            const answer = answers.find(a => a.questionId === q.id);
            if (!answer || answer.selectedIndex !== q.correctIndex) {
                isPass = false;
                break;
            }
        }

        if (isPass) {
            // Mark requirement as APPROVED
            await this.prisma.userRequirement.upsert({
                where: { userId_requirementId: { userId, requirementId } },
                update: { status: 'APPROVED', completedAt: new Date() },
                create: {
                    userId,
                    requirementId,
                    status: 'APPROVED',
                    completedAt: new Date()
                }
            });
            return { success: true, message: 'Parabéns! Você passou no questionário.' };
        } else {
            return { success: false, message: 'Respostas incorretas. Tente novamente.' };
        }
    }
    // --- BULK ASSIGNMENT ---

    async createAssignments(requirementId: string, userIds: string[], counselorId: string) {
        // 1. Validate Counselor/Admin permissions
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor) throw new Error('Conselheiro não encontrado');

        const validUserIds: string[] = [];

        if (counselor.role === 'COUNSELOR') {
            if (!counselor.unitId) throw new Error('Conselheiro não possui unidade vinculada');

            // Verify if all target users belong to the counselor's unit
            const users = await this.prisma.user.findMany({
                where: {
                    id: { in: userIds },
                    unitId: counselor.unitId
                },
                select: { id: true }
            });
            validUserIds.push(...users.map(u => u.id));
        } else if (['ADMIN', 'OWNER', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins can assign to anyone
            validUserIds.push(...userIds);
        } else {
            throw new Error('Permissão negada');
        }

        if (validUserIds.length === 0) return { count: 0, message: 'Nenhum usuário válido para atribuição' };

        // 2. Create Assignments (Upsert loop to avoid errors if already assigned)
        let count = 0;
        for (const uid of validUserIds) {
            const existing = await this.prisma.userRequirement.findUnique({
                where: { userId_requirementId: { userId: uid, requirementId } }
            });

            if (!existing) {
                await this.prisma.userRequirement.create({
                    data: {
                        userId: uid,
                        requirementId,
                        status: 'PENDING'
                    }
                });
                count++;
            }
        }

        return { count, message: `Requisito atribuído a ${count} desbravadores` };
    }

    // --- APPROVALS ---

    async getPendingApprovals(counselorId: string) {
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor || !counselor.unitId) return [];

        // For Admins/Owners, maybe return ALL pending?
        // For now, let's stick to Unit logic as requested.
        // If Admin/Owner has no unit, they might see nothing here, but they have other views.
        // Let's allow Admins to see ALL pending if they want? Or reuse this for Unit view.
        // The user request is specifically for "Minha Unidade".

        const whereClause: any = {
            status: 'PENDING',
            // Only showing those with answers? User said "aguardando aprovação". 
            // Usually 'PENDING' + answer means waiting approval.
            // If just assigned (no answer), it is also PENDING?
            // "Assign" creates PENDING. "Answer" updates PENDING.
            // We should filter where answerText is NOT null OR answerFileUrl is NOT null.
            OR: [
                { answerText: { not: null } },
                { answerFileUrl: { not: null } }
            ]
        };

        if (counselor.role === 'COUNSELOR') {
            whereClause.user = { unitId: counselor.unitId };
        } else if (['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins see all pending
            // no extra filter
        } else {
            return [];
        }

        return this.prisma.userRequirement.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { completedAt: 'desc' }
        });
    }

    async getAlertsForChild(childId: string) {
        return this.prisma.userRequirement.findMany({
            where: {
                userId: childId,
                status: { in: ['PENDING', 'REJECTED'] }
            },
            include: {
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { updatedAt: 'desc' }
        });
    }

    async getPendingDeliveries(counselorId: string) {
        const counselor = await this.prisma.user.findUnique({ where: { id: counselorId } });
        if (!counselor || !counselor.unitId) return [];

        const whereClause: any = {
            status: 'PENDING',
            answerText: null,
            answerFileUrl: null
        };

        if (counselor.role === 'COUNSELOR') {
            whereClause.user = { unitId: counselor.unitId };
        } else if (['OWNER', 'ADMIN', 'INSTRUCTOR'].includes(counselor.role)) {
            // Admins see all pending deliveries?
        } else {
            return [];
        }

        return this.prisma.userRequirement.findMany({
            where: whereClause,
            include: {
                user: { select: { id: true, name: true, photoUrl: true } },
                requirement: { select: { id: true, code: true, description: true, area: true } }
            },
            orderBy: { createdAt: 'asc' } // Oldest first
        });
    }

    async approveAssignment(id: string, approverId: string) {
        // 1. Fetch & Check Access
        const pending = await this.prisma.userRequirement.findUnique({
            where: { id },
            include: { user: true }
        });

        if (!pending) throw new Error('Requirement request not found');
        if (pending.user && pending.user.clubId) {
            await this.clubsService.checkWriteAccess(pending.user.clubId);
        }

        // 2. Approve
        const userReq = await this.prisma.userRequirement.update({
            where: { id },
            data: { status: 'APPROVED', completedAt: new Date() },
            include: {
                user: true,
                requirement: true
            }
        });

        const userId = userReq.userId;
        const user = userReq.user;
        const requirement = userReq.requirement;

        // 2. Class Progress & Scoring
        if (user.dbvClass && requirement.dbvClass === user.dbvClass) {
            const classReqsCount = await this.prisma.requirement.count({
                where: { dbvClass: user.dbvClass }
            });

            const userApprovedCount = await this.prisma.userRequirement.count({
                where: {
                    userId,
                    status: 'APPROVED',
                    requirement: { dbvClass: user.dbvClass }
                }
            });

            if (classReqsCount > 0) {
                const percent = (userApprovedCount / classReqsCount) * 100;
                let newPoints = 0;
                let newMilestone = user.lastClassMilestone;
                let msg = '';

                // Cumulative Checks
                if (percent >= 25 && user.lastClassMilestone < 25) {
                    newPoints += 100;
                    newMilestone = 25;
                    msg = 'Parabéns! Você completou 25% da sua classe (+100 XP)';
                }
                if (percent >= 50 && user.lastClassMilestone < 50) {
                    newPoints += 200;
                    newMilestone = 50;
                    msg = 'Incrível! Você completou 50% da sua classe (+200 XP)';
                }
                if (percent >= 75 && user.lastClassMilestone < 75) {
                    newPoints += 300;
                    newMilestone = 75;
                    msg = 'Quase lá! Você completou 75% da sua classe (+300 XP)';
                }
                if (percent >= 100 && user.lastClassMilestone < 100) {
                    newPoints += 1000;
                    newMilestone = 100;
                    msg = 'Fantástico! Você CONCLUIU sua classe! (+1000 XP)';
                }

                if (newPoints > 0) {
                    await this.prisma.user.update({
                        where: { id: userId },
                        data: {
                            points: { increment: newPoints },
                            lastClassMilestone: newMilestone,
                            pointsHistory: {
                                create: {
                                    amount: newPoints,
                                    reason: `Progresso de Classe (${percent}%)`,
                                    source: 'REQUIREMENT'
                                }
                            }
                        }
                    });

                    await this.notificationsService.send(userId, 'Progresso de Classe', msg, 'SUCCESS');
                }
            }
        }

        // 3. Specialty Logic
        if (requirement.specialtyId) {
            const specialtyReqsCount = await this.prisma.requirement.count({
                where: { specialtyId: requirement.specialtyId }
            });

            const userSpecialtyApprovedCount = await this.prisma.userRequirement.count({
                where: {
                    userId,
                    status: 'APPROVED',
                    requirement: { specialtyId: requirement.specialtyId }
                }
            });

            if (specialtyReqsCount > 0 && userSpecialtyApprovedCount === specialtyReqsCount) {
                // All requirements done. Check Approver Role.
                const approver = await this.prisma.user.findUnique({ where: { id: approverId } });

                if (approver && ['INSTRUCTOR', 'ADMIN', 'OWNER'].includes(approver.role)) {

                    // Check if already awarded
                    const existingSpecialty = await this.prisma.userSpecialty.findUnique({
                        where: { userId_specialtyId: { userId, specialtyId: requirement.specialtyId } }
                    });

                    if (!existingSpecialty || existingSpecialty.status !== 'COMPLETED') {
                        // Mark as Completed & Award Points
                        await this.prisma.userSpecialty.upsert({
                            where: { userId_specialtyId: { userId, specialtyId: requirement.specialtyId } },
                            update: { status: 'COMPLETED', awardedAt: new Date() },
                            create: {
                                userId,
                                specialtyId: requirement.specialtyId,
                                status: 'COMPLETED',
                                awardedAt: new Date()
                            }
                        });

                        // Award Specialty Points (e.g. 500 XP)
                        const SPECIALTY_POINTS = 500;
                        await this.prisma.user.update({
                            where: { id: userId },
                            data: {
                                points: { increment: SPECIALTY_POINTS },
                                pointsHistory: {
                                    create: {
                                        amount: SPECIALTY_POINTS,
                                        reason: 'Especialidade Concluída',
                                        source: 'SPECIALTY'
                                    }
                                }
                            }
                        });

                        await this.notificationsService.send(userId, 'Especialidade Concluída', 'Você concluiu uma nova especialidade! (+500 XP)', 'SUCCESS');
                    }
                }
            }
        }

        return userReq;
    }

    async rejectAssignment(id: string) {
        // Option A: Delete and reset?
        // Option B: Set status REJECTED (allowing re-submission?)
        // Let's set to REJECTED.
        // Actually, if we set to REJECTED, the user needs to know.
        // Or we just clear the answer and set status PENDING?
        // Let's just update prompt to REJECTED status.
        return this.prisma.userRequirement.update({
            where: { id },
            data: { status: 'REJECTED' } // We might need to handle this status in frontend
        });
    }
}

