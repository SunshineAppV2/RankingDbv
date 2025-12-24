import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ClassesService {
    constructor(private prisma: PrismaService) { }

    async getStudentsByClass(currentUser: any, className: string) {
        try {
            // className expects uppercase enum key e.g. "AMIGO", "COMPANHEIRO"

            const whereClause: any = {
                clubId: currentUser.clubId,
                dbvClass: className as any, // Cast to enum
                role: 'PATHFINDER'
            };

            // Filter: Counselor/Instructor only sees members of their Unit (if assigned to one)
            // Director/Admin sees ALL.
            if ((currentUser.role === 'COUNSELOR' || currentUser.role === 'INSTRUCTOR') && currentUser.unitId) {
                whereClause.unitId = currentUser.unitId;
            }

            // Safety: If clubId is missing, return empty or throw? 
            if (!currentUser.clubId) {
                console.warn('getStudentsByClass: Missing clubId for user', currentUser.id);
                return [];
            }

            const students = await this.prisma.user.findMany({
                where: whereClause,
                include: {
                    unit: true,
                    requirements: {
                        where: { status: 'PENDING' }, // Get pending reqs for quick view
                        include: { requirement: true } // Crucial for displaying Requirement Code/Desc
                    }
                },
                orderBy: { name: 'asc' }
            });

            return students || [];
        } catch (error) {
            console.error('Error in getStudentsByClass:', error);
            throw error; // Re-throw to be handled by NestJS Filter
        }
    }
}
