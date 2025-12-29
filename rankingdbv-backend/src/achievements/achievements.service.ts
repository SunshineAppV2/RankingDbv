
import { Injectable } from '@nestjs/common';
import { firebaseAdmin } from '../firebase-admin';
import { CreateAchievementDto } from './dto/create-achievement.dto';
import { AssignAchievementDto } from './dto/assign-achievement.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AchievementsService {
    constructor(private notificationsService: NotificationsService) { }

    async create(createAchievementDto: CreateAchievementDto) {
        const docRef = await firebaseAdmin.firestore().collection('achievements').add({
            ...createAchievementDto,
            createdAt: new Date().toISOString()
        });
        return { id: docRef.id, ...createAchievementDto };
    }

    async findAll() {
        const snapshot = await firebaseAdmin.firestore().collection('achievements').get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async assign(assignAchievementDto: AssignAchievementDto, assignedBy: string) {
        // Check duplication?
        const existing = await firebaseAdmin.firestore().collection('user_achievements')
            .where('userId', '==', assignAchievementDto.userId)
            .where('achievementId', '==', assignAchievementDto.achievementId)
            .get();

        if (!existing.empty) {
            throw new Error('Achievement already assigned to this user');
        }

        const achRef = await firebaseAdmin.firestore().collection('achievements').doc(assignAchievementDto.achievementId).get();
        if (!achRef.exists) throw new Error('Achievement not found');
        const achData = achRef.data();

        // Add record
        const docRef = await firebaseAdmin.firestore().collection('user_achievements').add({
            ...assignAchievementDto,
            assignedAt: new Date().toISOString(),
            assignedBy
        });

        // Notify User
        const achName = achData?.name || 'Nova Conquista';
        await this.notificationsService.send(
            assignAchievementDto.userId,
            'Conquista Desbloqueada! 🏆',
            `Parabéns! Você desbloqueou a conquista: ${achName}`,
            'SUCCESS'
        );

        // If achievement has points, add to user?
        if (achData?.points && achData.points > 0) {
            const userRef = firebaseAdmin.firestore().collection('users').doc(assignAchievementDto.userId);
            const userSnap = await userRef.get();
            if (userSnap.exists) {
                const currentPoints = userSnap.data()?.points || 0;
                await userRef.update({ points: currentPoints + achData.points });
            }
        }

        return { id: docRef.id, ...assignAchievementDto };
    }

    async findByUser(userId: string) {
        const snapshot = await firebaseAdmin.firestore().collection('user_achievements')
            .where('userId', '==', userId)
            .get();

        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
