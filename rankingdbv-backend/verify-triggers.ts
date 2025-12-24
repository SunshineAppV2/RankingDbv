import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { StoreService } from './src/store/store.service';
import { PrismaService } from './src/prisma/prisma.service';

async function verify() {
    console.log('Initializing Verification...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const storeService = app.get(StoreService);
    const prisma = app.get(PrismaService);

    // 1. Get Test User and Product
    const user = await prisma.user.findUnique({ where: { email: 'test@rankingdbv.com' } });

    if (!user) {
        console.error('Test user not found. Run seed-test.ts first.');
        process.exit(1);
    }

    // Fetch product from Master Club directly
    const club = await prisma.club.findUnique({ where: { slug: 'master-club' } });
    const product = await prisma.product.findFirst({ where: { clubId: club?.id } });

    if (!product) {
        console.error('Test product not found or Club not found. Run seed-test.ts first.');
        process.exit(1);
    }

    console.log(`User: ${user.email} (Points: ${user.points})`);
    console.log(`Product: ${product.name} (Price: ${product.price})`);

    // 2. Perform Purchase
    console.log('Attempting Purchase...');
    try {
        const result = await storeService.buyProduct(user.id, product.id);
        console.log('Purchase Successful:', result.purchase.id);
    } catch (e) {
        console.error('Purchase Failed:', e.message);
        process.exit(1);
    }

    // 3. Verify Notification
    console.log('Verifying Notification...');
    const notification = await prisma.notification.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
    });

    if (notification && notification.title === 'Compra Realizada!') {
        console.log('SUCCESS: Notification found!');
        console.log('Title:', notification.title);
        console.log('Message:', notification.message);
    } else {
        console.error('FAILURE: Notification NOT found or incorrect.');
        console.log('Last Notification:', notification);
    }

    await app.close();
}

verify();
