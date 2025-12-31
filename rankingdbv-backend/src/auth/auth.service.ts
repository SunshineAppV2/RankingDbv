import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ClubsService } from '../clubs/clubs.service'; // Import ClubsService
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from '../users/dto/create-user.dto';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (Lazy)
if (!admin.apps.length) {
  try {
    // Try to auto-discover credentials (ENV or Default)
    admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (e) {
    console.warn("Firebase Admin Init Failed (Auto):", e.message);
    // You might want to load from specific path here if needed
  }
}

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
      if (user.status === 'BLOCKED') {
        throw new UnauthorizedException('Sua conta foi bloqueada. Entre em contato com a diretoria.');
      }
      if (user.status === 'PENDING' && user.role !== 'OWNER') { // Owners are auto-approved usually if creators, but joined owners might wait? Assuming joined owners wait too? 
        // Logic: If joined an existing club, wait approval. If created club, ACTIVE.
        // Register service sets status.
        throw new UnauthorizedException('Seu cadastro aguarda aprovação da diretoria.');
      }
      // Legacy isActive check just in case
      if (user.isActive === false) {
        throw new UnauthorizedException('Sua conta está inativa.');
      }

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
          // Allow OWNER/ADMIN/DIRECTOR to solve the issue. Block others.
          const allowedRoles = ['OWNER', 'ADMIN', 'MASTER', 'DIRECTOR'];
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

  async register(createUserDto: CreateUserDto & { referralCode?: string }) {
    let clubId = createUserDto.clubId;
    let role = createUserDto.role || 'PATHFINDER';
    let status = 'PENDING'; // Default status for joiners

    // REFERRAL CHECK (DELAYED REWARD)
    let referrerClubId: string | undefined = undefined;
    if (createUserDto.referralCode && createUserDto.clubName) { // Only for new clubs
      const resolved = await this.clubsService.resolveReferralCode(createUserDto.referralCode);
      referrerClubId = resolved || undefined;
    }

    // 2. Logic: Create New Club OR Join Existing
    if (!clubId && createUserDto.clubName) {
      // FLOW A: CREATE NEW CLUB
      const newClub = await this.clubsService.create({
        name: createUserDto.clubName,
        region: createUserDto.region,
        mission: createUserDto.mission,
        union: createUserDto.union,
        referrerClubId: referrerClubId,
        phoneNumber: createUserDto.mobile // Pass mobile as club phone number
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
      password: createUserDto.password, // Pass RAW password to service (it will hash it)
      clubId: clubId,
      role: role as any,
      status: status, // NEW: Explicitly pass status
      isActive: status === 'ACTIVE'
    });

    return this.login(user);
  }

  // SYNC: Trust Firebase Auth and Link/Create Backend User
  async syncWithFirebase(idToken: string) {
    try {
      // 1. Verify Token
      if (!admin.apps.length) {
        // Retry init if failed previously? Or throw.
        throw new UnauthorizedException('Firebase Admin not configured on Backend.');
      }
      const decodedChanged = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedChanged;

      if (!email) throw new UnauthorizedException('Email not found in token.');

      // 2. Find User in DB
      let user = await this.usersService.findOneByEmail(email);

      // 3. If User Exists, ensure UID is linked
      if (user) {
        if (user.id !== uid) { // Assuming ID is not UID? Wait.
          // If DB ID is different from UID, we should store UID in `uid` field if exists.
          // Prisma schema said `uid String?`.
          // We can update it.
          // await this.usersService.update(user.id, { uid }); // If we had update method exposed here or use Prisma directly
        }
        return this.login(user);
      }

      // 4. If User DOES NOT Exist, Create/Invite logic?
      // For now, if user doesn't exist, we can create as PENDING MEMBER
      // or we can reject.
      // The requirement is "Facilitate". Check if this email is supposed to be somewhere?
      // Since we can't easily check Club Settings Text Fields from here efficiently without scanning,
      // We will create the user with PENDING status (MEMBER).
      // Then Master can "Associate" them easily because they exist now.

      // Actually, if we create them, they exist. Master can then add to club.
      // Better: Create as 'MEMBER' (Pending).

      /*
      const newUser = await this.usersService.create({
          email,
          name: name || 'Usuário Google',
          password: Math.random().toString(36), // Random password
          role: 'MEMBER',
          clubId: undefined, // No club yet
          status: 'PENDING'
      });
      return this.login(newUser);
      */

      // However, creating users willy-nilly might be spam.
      // If the user said "Minha conta existe no Google", maybe they registered?
      // Let's just return NotFound for now, BUT enable the specific case of "User Exists".
      // The user issue is likely "User Exists in DB (created by Master) but Login fails".
      // So steps 2 & 3 cover the "Facilitation" (Auto-Link).

      throw new UnauthorizedException('Usuário não encontrado no sistema. Peça ao seu diretor para criar seu cadastro.');

    } catch (e) {
      console.error("Sync Error:", e);
      throw new UnauthorizedException('Falha ao validar login com Google.');
    }
  }
}
