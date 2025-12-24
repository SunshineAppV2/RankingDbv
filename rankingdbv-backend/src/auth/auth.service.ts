import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ClubsService } from '../clubs/clubs.service'; // Import ClubsService
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private clubsService: ClubsService, // Inject it
    private jwtService: JwtService,
  ) { }

  // 1. Valida se usuário existe e senha bate
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);

    // Compara a senha digitada com o hash do banco
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    if (user.clubId) {
      try {
        const club = await this.clubsService.getClubStatus(user.clubId);

        let isOverdue = club.subscriptionStatus === 'OVERDUE' || club.subscriptionStatus === 'CANCELED';

        // Check Dynamic Date (if status is not explicitly overdue yet)
        if (!isOverdue && club.nextBillingDate) {
          const today = new Date();
          const billingDate = new Date(club.nextBillingDate);
          const gracePeriod = (club.gracePeriodDays && !isNaN(Number(club.gracePeriodDays))) ? Number(club.gracePeriodDays) : 0;

          const cutoffDate = new Date(billingDate);
          cutoffDate.setDate(cutoffDate.getDate() + gracePeriod);

          console.log(`[AuthService] Checking Club: ${club.name}`);
          console.log(`[AuthService] Billing: ${billingDate.toISOString()} + Grace: ${gracePeriod} days = Cutoff: ${cutoffDate.toISOString()}`);
          console.log(`[AuthService] Today: ${today.toISOString()}`);

          // If today is AFTER the cutoff date (billing + grace), it is overdue
          if (today > cutoffDate) {
            console.log(`[AuthService] RESULT: OVERDUE (Blocking access)`);
            isOverdue = true;
          } else {
            console.log(`[AuthService] RESULT: OK (Within grace period)`);
          }
        }

        if (isOverdue) {
          // Allow OWNER/ADMIN to solve the issue. Block others.
          const allowedRoles = ['OWNER', 'ADMIN', 'MASTER'];
          if (!allowedRoles.includes(user.role)) {
            throw new Error('SUBSCRIPTION_OVERDUE'); // Catch below
          }
        }
      } catch (error) {
        if (error.message === 'SUBSCRIPTION_OVERDUE') {
          throw new UnauthorizedException('O acesso deste clube está suspenso. Contate a direção.');
        }
        // Ignore other errors (like club not found if inconsistent) to allow login? 
        // Or rethrow? Safer to ignore if just checking status? 
        // but getClubStatus throws if not found.
      }
    }

    const payload = {
      email: user.email,
      sub: user.id,
      clubId: user.clubId,
      unitId: user.unitId, // Include unitId
      role: user.role
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        clubId: user.clubId,
        unitId: user.unitId, // Include unitId
        role: user.role
      }
    };
  }

  async register(createUserDto: CreateUserDto) {
    // 1. Hash Password
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    let clubId = createUserDto.clubId;
    let role = createUserDto.role || 'PATHFINDER';
    let status = 'PENDING'; // Default status for joiners

    // 2. Logic: Create New Club OR Join Existing
    if (!clubId && createUserDto.clubName) {
      // FLOW A: CREATE NEW CLUB
      const newClub = await this.clubsService.create({
        name: createUserDto.clubName,
        region: createUserDto.region,
        mission: createUserDto.mission,
        union: createUserDto.union
      });

      clubId = newClub.id;
      role = 'OWNER'; // Creator is Owner
      status = 'ACTIVE'; // Creator is auto-approved

    } else if (clubId) {
      // FLOW B: JOIN EXISTING CLUB
      // Keep role as requested (or default to PATHFINDER)
      // Keep status as PENDING (needs approval)
    } else {
      // Fallback (should not happen in valid UI flow)
      throw new Error('Club ID or Club Name must be provided');
    }

    // 3. Security Check (Prevent arbitrary Owner creation without club)
    if (role === 'OWNER' && !createUserDto.clubName) {
      role = 'PATHFINDER';
    }

    // 4. Create User
    const user = await this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
      clubId: clubId,
      role: role as any,
      status: status as any
    });

    return this.login(user);
  }
}
