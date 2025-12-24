import { PrismaClient, Role, PlanTier, ClubStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando Seed...');

  // Definições
  const clubId = '0001';
  const emailDiretor = 'diretor@aguias.com';
  const senhaPura = '123456';

  // Hash
  const passwordHash = await bcrypt.hash(senhaPura, 10);

  // Clube
  const club = await prisma.club.upsert({
    where: { id: clubId },
    update: {},
    create: {
      id: clubId,
      name: 'Clube Águias da Colina',
      planTier: PlanTier.TRIAL,
      status: ClubStatus.ACTIVE,
    },
  });
  console.log(`🏢 Clube OK: ${club.name}`);

  // Usuário
  const user = await prisma.user.upsert({
    where: { email: emailDiretor },
    update: { password: passwordHash, clubId: club.id },
    create: {
      email: emailDiretor,












      name: 'Diretor Admin',
      password: passwordHash,
      role: Role.OWNER,
      clubId: club.id,
    },
  });
  console.log(`👤 Usuário OK: ${user.email}`);

  // Usuário Master
  const emailMaster = 'master@rankingdbv.com';
  const masterUser = await prisma.user.upsert({
    where: { email: emailMaster },
    update: { password: passwordHash, clubId: club.id, role: Role.OWNER },
    create: {
      email: emailMaster,
      name: 'Master Admin',
      password: passwordHash,
      role: Role.OWNER,
      clubId: club.id,
    },
  });
  console.log(`👤 Usuário Master OK: ${masterUser.email}`);
  console.log







    ('✅ SUCESSO TOTAL!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
