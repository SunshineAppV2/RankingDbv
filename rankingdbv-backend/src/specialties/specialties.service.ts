import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSpecialtyDto } from './dto/create-specialty.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { RequirementStatus, UserSpecialtyStatus } from '@prisma/client';

@Injectable()
export class SpecialtiesService {
    constructor(
        private prisma: PrismaService,
        private notificationsService: NotificationsService
    ) { }

    async create(createSpecialtyDto: CreateSpecialtyDto) {
        const { requirements, ...data } = createSpecialtyDto;

        return this.prisma.specialty.create({
            data: {
                ...data,
                requirements: {
                    create: requirements?.map(r => ({
                        description: r.description,
                        type: r.type || 'TEXT'
                    }))
                }
            },
            include: { requirements: true }
        });
    }

    findAll() {
        return this.prisma.specialty.findMany({
            orderBy: { name: 'asc' },
            include: { requirements: true }
        });
    }

    async findOne(id: string) {
        const specialty = await this.prisma.specialty.findUnique({
            where: { id },
            include: {
                requirements: {
                    orderBy: [
                        { area: 'asc' },
                        { code: 'asc' },
                        { description: 'asc' }
                    ]
                }
            }
        });
        if (!specialty) throw new NotFoundException('Especialidade nÃ£o encontrada');
        return specialty;
    }

    async findAllForUser(userId: string) {
        return this.prisma.userSpecialty.findMany({
            where: { userId },
            include: { specialty: true } // Include specialty details
        });
    }

    // Get User Progress on a Specialty
    async getUserProgress(userId: string, specialtyId: string) {
        return this.prisma.userSpecialty.findUnique({
            where: { userId_specialtyId: { userId, specialtyId } },
            include: { user: true, specialty: true }
        });
    }

    async getDashboardData(clubId: string) {
        // 1. Get all Users for the club with their specialty associations and requirements
        const users = await this.prisma.user.findMany({
            where: { clubId },
            select: {
                id: true,
                name: true,
                photoUrl: true,
                role: true,
                specialties: {
                    include: {
                        specialty: {
                            include: {
                                _count: { select: { requirements: true } },
                                requirements: { select: { id: true } }
                            }
                        }
                    }
                },
                requirements: {
                    select: {
                        requirementId: true,
                        status: true,
                        requirement: {
                            select: { specialtyId: true }
                        }
                    }
                }
            }
        });

        // 2. Identify which specialties are active for this club
        const activeSpecialtyIds = new Set<string>();
        users.forEach(u => {
            u.specialties.forEach(us => activeSpecialtyIds.add(us.specialtyId));
            u.requirements.forEach(ur => {
                if (ur.requirement?.specialtyId) activeSpecialtyIds.add(ur.requirement.specialtyId);
            });
        });

        // 3. Get ONLY those specialties
        const specialties = await this.prisma.specialty.findMany({
            where: { id: { in: Array.from(activeSpecialtyIds) } },
            include: {
                _count: {
                    select: { requirements: true }
                }
            }
        });

        // 4. Process stats only for active specialties
        const stats = specialties.map(specialty => {
            const totalReqs = specialty._count.requirements;
            const members = users
                .filter(u =>
                    u.specialties.some(us => us.specialtyId === specialty.id) ||
                    u.requirements.some(ur => ur.requirement?.specialtyId === specialty.id)
                )
                .map(u => {
                    const us = u.specialties.find(s => s.specialtyId === specialty.id);
                    // Use specialtyId from requirement if us is missing
                    const approvedReqsCount = u.requirements.filter(ur =>
                        (ur.requirement?.specialtyId === specialty.id) &&
                        ur.status === 'APPROVED'
                    ).length;

                    const progress = totalReqs > 0 ? Math.round((approvedReqsCount / totalReqs) * 100) : 0;

                    return {
                        id: u.id,
                        name: u.name,
                        photoUrl: u.photoUrl,
                        progress,
                        status: us?.status || (progress > 0 ? 'IN_PROGRESS' : 'PENDING'),
                        rank: u.role
                    };
                });

            return {
                id: specialty.id,
                name: specialty.name,
                area: specialty.area,
                imageUrl: specialty.imageUrl,
                totalRequirements: totalReqs,
                members
            };
        });

        return {
            specialties: stats,
            allUsers: users.map(u => {
                const uniqueSpecialties = new Set([
                    ...u.specialties.map(us => us.specialtyId),
                    ...u.requirements
                        .filter(ur => ur.requirement?.specialtyId)
                        .map(ur => ur.requirement!.specialtyId!)
                ]);

                return {
                    id: u.id,
                    name: u.name,
                    photoUrl: u.photoUrl,
                    role: u.role,
                    activeSpecialtiesCount: uniqueSpecialties.size
                };
            })
        };
    }

    // Get User Requirements Progress
    async getUserRequirements(userId: string, identifier: string) {
        // identifier can be specialtyId (UUID) or dbvClass (String)
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

        if (isUUID) {
            return this.prisma.userRequirement.findMany({
                where: {
                    userId,
                    requirement: { specialtyId: identifier }
                },
                include: { requirement: true }
            });
        } else {
            // Assume it's a DBVClass enum value
            return this.prisma.userRequirement.findMany({
                where: {
                    userId,
                    requirement: { dbvClass: identifier as any } // Cast to any or DBVClass if imported
                },
                include: { requirement: true }
            });
        }
    }

    // Submit an answer to a requirement
    async submitAnswer(userId: string, dto: SubmitAnswerDto) {
        const requirement = await this.prisma.requirement.findUnique({ where: { id: dto.requirementId } });
        if (!requirement) throw new NotFoundException('Requisito nÃ£o encontrado');

        // Upsert UserRequirement
        return this.prisma.userRequirement.upsert({
            where: {
                userId_requirementId: { userId, requirementId: dto.requirementId }
            },
            create: {
                userId,
                requirementId: dto.requirementId,
                status: RequirementStatus.PENDING,
                answerText: dto.text,
                answerFileUrl: dto.fileUrl,
                completedAt: new Date()
            },
            update: {
                status: RequirementStatus.PENDING, // Reset to pending on new submission
                answerText: dto.text,
                answerFileUrl: dto.fileUrl,
                completedAt: new Date()
            }
        });
    }

    // Verify or Reject a requirement
    async setRequirementStatus(userId: string, requirementId: string, status: RequirementStatus) {
        // Debug Log
        const fs = require('fs');
        const logPath = 'g:/Ranking DBV/rankingdbv-backend/debug_xp.txt';
        const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);

        log(`[setRequirementStatus] User: ${userId}, Req: ${requirementId}, Status: "${status}" vs ENUM: "${RequirementStatus.APPROVED}"`);

        // 1. Update the requirement status
        const updatedRequirement = await this.prisma.userRequirement.upsert({
            where: {
                userId_requirementId: { userId, requirementId }
            },
            create: {
                userId,
                requirementId,
                status,
                completedAt: status === RequirementStatus.APPROVED ? new Date() : null
            },
            update: {
                status,
                completedAt: status === RequirementStatus.APPROVED ? new Date() : null
            }
        });

        // 2. If APPROVED, check if ALL requirements for this specialty are approved
        if (status === RequirementStatus.APPROVED) {
            log('[setRequirementStatus] Status matched APPROVED. Checking completions...');
            console.log('[setRequirementStatus] Status is APPROVED. Checking completions...');
            try {
                await this.checkSpecialtyCompletion(userId, requirementId);
            } catch (e) {
                console.error('Error checking specialty completion:', e);
            }
            try {
                await this.checkClassCompletion(userId, requirementId);
            } catch (e) {
                console.error('Error checking class completion:', e);
            }
        } else {
            console.log(`[setRequirementStatus] Status ${status} is not APPROVED. Skipping checks.`);
        }

        return updatedRequirement;
    }

    private async checkClassCompletion(userId: string, requirementId: string) {
        // Debug Log
        const fs = require('fs');
        const logPath = 'g:/Ranking DBV/rankingdbv-backend/debug_xp.txt';
        const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);

        log(`Checking Class Completion for User ${userId}, Req ${requirementId}`);
        const req = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
            select: { dbvClass: true }
        });

        if (!req || !req.dbvClass) {
            console.log('Skipping validation: Request is not a class requirement');
            return;
        }

        // Count total requirements for this class
        const total = await this.prisma.requirement.count({
            where: { dbvClass: req.dbvClass }
        });

        if (total === 0) return;

        // Count approved requirements for this user in this class
        const approved = await this.prisma.userRequirement.count({
            where: {
                userId,
                status: RequirementStatus.APPROVED,
                requirement: { dbvClass: req.dbvClass }
            }
        });

        const percentage = Math.round((approved / total) * 100);
        log(`Class Progress: ${approved}/${total} (${percentage}%)`);

        // Milestones: 25(100xp), 50(200xp), 75(300xp), 100(1000xp)
        const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { lastClassMilestone: true, points: true } });
        if (!user) return;

        let newPoints = 0;
        let newMilestone = user.lastClassMilestone;

        // Check 25%
        if (percentage >= 25 && user.lastClassMilestone < 25) {
            newPoints += 100;
            newMilestone = (newMilestone < 25) ? 25 : newMilestone;
        }
        // Check 50%
        if (percentage >= 50 && user.lastClassMilestone < 50) {
            newPoints += 200;
            newMilestone = (newMilestone < 50) ? 50 : newMilestone;
        }
        // Check 75%
        if (percentage >= 75 && user.lastClassMilestone < 75) {
            newPoints += 300;
            newMilestone = (newMilestone < 75) ? 75 : newMilestone;
        }
        // Check 100%
        if (percentage >= 100 && user.lastClassMilestone < 100) {
            newPoints += 1000;
            newMilestone = 100;
        }

        if (newPoints > 0) {
            log(`Awarding ${newPoints} XP. New Milestone: ${newMilestone}`);
            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    points: { increment: newPoints },
                    lastClassMilestone: newMilestone,
                    pointsHistory: {
                        create: {
                            amount: newPoints,
                            reason: `Progresso de Classe (${percentage}%)`,
                            source: 'REQUIREMENT'
                        }
                    }
                }
            });

            await this.notificationsService.send(
                userId,
                'Bônus de Classe!',
                `Parabéns! Você alcançou ${percentage}% da sua classe e ganhou ${newPoints} XP!`,
                'SUCCESS'
            );
        } else {
            log(`No new milestone. Current: ${user.lastClassMilestone}, Calc: ${percentage}`);
        }
    }

    private async checkSpecialtyCompletion(userId: string, requirementId: string) {
        // Get the requirement to find the specialtyId
        const req = await this.prisma.requirement.findUnique({
            where: { id: requirementId },
            select: { specialtyId: true }
        });

        if (!req || !req.specialtyId) return;

        // Get all requirements for this specialty
        const allRequirements = await this.prisma.requirement.findMany({
            where: { specialtyId: req.specialtyId }
        });

        // Get all user answers/status for this specialty
        const userRequirements = await this.prisma.userRequirement.findMany({
            where: {
                userId,
                requirement: { specialtyId: req.specialtyId }
            }
        });

        // Check if every requirement in the specialty has a corresponding APPROVED UserRequirement
        const allApproved = allRequirements.every(r =>
            userRequirements.some(ur => ur.requirementId === r.id && ur.status === RequirementStatus.APPROVED)
        );

        if (allApproved) {
            // Check if Specialty is already completed to avoid double notification
            const userSpecialty = await this.prisma.userSpecialty.findUnique({
                where: { userId_specialtyId: { userId, specialtyId: req.specialtyId } }
            });

            if (!userSpecialty || (userSpecialty.status !== UserSpecialtyStatus.COMPLETED && userSpecialty.status !== UserSpecialtyStatus.WAITING_APPROVAL)) {
                // Mark as WAITING_APPROVAL or COMPLETED?
                // If the ADMIN is the one approving requirements manually, they are effectively verifying it.
                // So we can mark as WAITING_APPROVAL so they can hit the final "Award" button, 
                // OR we can just mark it WAITING_APPROVAL.
                // Let's set it to WAITING_APPROVAL so it shows up in "Pending Specialties" list for final sign-off,
                // or directly complete if we trust the requirement loop.
                // User request is "logica da aprovaÃ§Ã£o".
                // Let's sets it to WAITING_APPROVAL so the "Aprovar e Conceder Pontos" (final button) makes sense.

                await this.prisma.userSpecialty.upsert({
                    where: { userId_specialtyId: { userId, specialtyId: req.specialtyId } },
                    create: {
                        userId,
                        specialtyId: req.specialtyId,
                        status: UserSpecialtyStatus.WAITING_APPROVAL
                    },
                    update: {
                        status: UserSpecialtyStatus.WAITING_APPROVAL
                    }
                });

                // Notify Admins
                try {
                    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { name: true, clubId: true } });
                    const specialty = await this.prisma.specialty.findUnique({ where: { id: req.specialtyId }, select: { name: true } });
                    if (user && user.clubId && specialty) {
                        const admins = await this.prisma.user.findMany({
                            where: { clubId: user.clubId, role: { in: ['OWNER', 'ADMIN', 'INSTRUCTOR'] } },
                            select: { id: true }
                        });
                        for (const admin of admins) {
                            await this.notificationsService.send(
                                admin.id,
                                'Especialidade Aguardando Aprovação',
                                `${user.name} concluiu todos os requisitos de ${specialty.name}.`,
                                'INFO'
                            );
                        }
                    }
                } catch (e) {
                    console.error('Error sending specialty completion notification:', e);
                }
            }
        }
    }

    async findAllPending(clubId: string) {
        // Fetch pending specialties (completed entire specialty waiting for final check)
        // AND pending requirements (individual items)

        const pendingRequirements = await this.prisma.userRequirement.findMany({
            where: {
                status: RequirementStatus.PENDING,
                user: { clubId: clubId }
            },
            include: {
                user: true,
                requirement: {
                    include: { specialty: true }
                }
            },
            orderBy: { completedAt: 'desc' } // or creation time? userRequirement doesn't have createdAt, using completedAt as "submission time" if usually set on submit
        });

        // We might also want specialties that are marked 'WAITING_APPROVAL' if that flow exists
        const pendingSpecialties = await this.prisma.userSpecialty.findMany({
            where: {
                status: UserSpecialtyStatus.WAITING_APPROVAL,
                user: { clubId: clubId }
            },
            include: {
                user: true,
                specialty: true
            }
        });

        return {
            requirements: pendingRequirements,
            specialties: pendingSpecialties
        };
    }

    // Admin approves the entire specialty completion
    // This could also be per-requirement, but let's assume final approval for now
    async approveSpecialty(userId: string, specialtyId: string) {
        // Check if already awarded/completed
        const exists = await this.prisma.userSpecialty.findUnique({
            where: { userId_specialtyId: { userId, specialtyId } }
        });

        if (exists && exists.status === UserSpecialtyStatus.COMPLETED) return exists;

        const specialty = await this.prisma.specialty.findUnique({ where: { id: specialtyId } });
        if (!specialty) throw new NotFoundException('Especialidade nÃ£o encontrada');

        // 1. Create or Update Relation
        const result = await this.prisma.userSpecialty.upsert({
            where: { userId_specialtyId: { userId, specialtyId } },
            create: {
                userId,
                specialtyId,
                status: UserSpecialtyStatus.COMPLETED,
                awardedAt: new Date()
            },
            update: {
                status: UserSpecialtyStatus.COMPLETED,
                awardedAt: new Date()
            }
        });

        // 2. Award Points (Standard 250 XP if not already awarded?)
        // To prevent double points, we should check if points were already given.
        if (!exists || exists.status !== UserSpecialtyStatus.COMPLETED) {
            const POINTS = 250;

            // Debug Log
            const fs = require('fs');
            const logPath = 'g:/Ranking DBV/rankingdbv-backend/debug_xp.txt';
            const log = (msg: string) => fs.appendFileSync(logPath, `${new Date().toISOString()} - ${msg}\n`);

            log(`[Specialty Approved] User: ${userId}, Specialty: ${specialty.name}, Points: ${POINTS}`);

            await this.prisma.user.update({
                where: { id: userId },
                data: {
                    points: { increment: POINTS },
                    pointsHistory: {
                        create: {
                            amount: POINTS,
                            reason: `Especialidade Aprovada: ${specialty.name}`,
                            source: 'SPECIALTY'
                        }
                    }
                }
            });

            // 3. Notify User
            await this.notificationsService.send(
                userId,
                'Especialidade Aprovada!',
                `Sua especialidade ${specialty.name} foi aprovada e você ganhou ${POINTS} XP! Certificado disponível.`,
                'SUCCESS'
            );
        }

        return result;
    }

    // Assign a specialty (Start it for a user)
    async assignSpecialty(userId: string, specialtyId: string) {
        // Check if already assigned
        const exists = await this.prisma.userSpecialty.findUnique({
            where: { userId_specialtyId: { userId, specialtyId } }
        });

        if (exists) return exists; // Already assigned or completed

        return this.prisma.userSpecialty.create({
            data: {
                userId,
                specialtyId,
                status: UserSpecialtyStatus.IN_PROGRESS
            }
        });
    }

    update(id: string, data: any) {
        return this.prisma.specialty.update({
            where: { id },
            data
        });
    }

    remove(id: string) {
        return this.prisma.specialty.delete({
            where: { id }
        });
    }

    // Importar via Excel
    async importSpecialties(file: Express.Multer.File) {
        const XLSX = require('xlsx');
        const workbook = XLSX.read(file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        console.log('Importing Specialties - Sheet:', sheetName);

        const specialtiesToCreate: any[] = [];
        for (const row of rows as any[]) {
            const keys = Object.keys(row);
            const nameKey = keys.find(k => k.trim().toLowerCase() === 'nome' || k.trim().toLowerCase() === 'name');
            const areaKey = keys.find(k => k.trim().toLowerCase() === 'area' || k.trim().toLowerCase() === 'Ã¡rea');

            const name = nameKey ? row[nameKey] : null;
            const area = areaKey ? row[areaKey] : 'Geral';

            if (name) {
                specialtiesToCreate.push({
                    name: String(name).trim(),
                    area: String(area).trim(),
                    imageUrl: ''
                });
            }
        }

        if (specialtiesToCreate.length === 0) {
            throw new Error('Nenhuma especialidade vÃ¡lida encontrada.');
        }

        return this.prisma.specialty.createMany({
            data: specialtiesToCreate,
            skipDuplicates: true
        });
    }

    async importFromUrl(url: string) {
        const axios = require('axios');
        const cheerio = require('cheerio');

        try {
            console.log(`Fetching URL: ${url}`);
            const { data } = await axios.get(url);
            const $ = cheerio.load(data);

            // 1. Extract Name (Title)
            // Usually in <h1> or specific class
            let name = $('h1').first().text().trim();
            name = name.replace('Especialidade de ', '').replace('Especialidade ', '');


            // 2. Extract Image
            let imageUrl = '';
            const imgElement = $('.infobox img, .thumb img, table img').first();
            if (imgElement.length) {
                const src = imgElement.attr('src');
                if (src) {
                    imageUrl = src.startsWith('http') ? src : `https://mda.wiki.br${src}`;
                }
            }

            // 3. Extract Area (Category)
            // Searching for "Ãrea" text
            let area = 'Geral';
            $('b, strong').each((i, el) => {
                const text = $(el).text();
                if (text.includes('Ãrea')) {
                    // Next sibling or parent text?
                    // MDA Wiki often has: <b>Ãrea:</b> <a ...>Natureza</a>
                    const parent = $(el).parent();
                    area = parent.text().replace('Ãrea', '').replace(':', '').trim();
                }
            });

            // 4. Extract Requirements
            const requirements: any[] = [];

            // Logic: Find the ordered list <ol>
            const ol = $('ol').first();
            if (ol.length) {
                ol.find('li').each((i, el) => {
                    // Get text, clean up
                    let text = $(el).text().trim();
                    // Remove newlines
                    text = text.replace(/\s+/g, ' ');
                    requirements.push({
                        description: `${i + 1}. ${text}`,
                        type: 'TEXT'
                    });
                });
            } else {
                // Try finding numbered list by text analysis if <ol> missing?
                // Fallback: looking for p tags starting with numbers?
                console.warn('No <ol> found, trying generic parsing');
            }

            if (requirements.length === 0) {
                throw new Error('NÃ£o foi possÃ­vel extrair os requisitos. O formato da pÃ¡gina pode ser diferente.');
            }

            console.log(`Extracted: ${name}, Area: ${area}, Reqs: ${requirements.length}`);

            // Check if exists
            const existing = await this.prisma.specialty.findFirst({ where: { name } });
            if (existing) {
                throw new Error(`A especialidade "${name}" jÃ¡ estÃ¡ cadastrada.`);
            }

            // Create
            return this.prisma.specialty.create({
                data: {
                    name,
                    area,
                    imageUrl,
                    requirements: {
                        create: requirements
                    }
                },
                include: { requirements: true }
            });

        } catch (error) {
            console.error('Scraping Error:', error);
            throw new Error('Erro ao importar do link: ' + (error as any).message);
        }
    }
}
