import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule);

    // Security Headers
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow serving images
    }));

    // Rate Limiting
    app.use(
        rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 500, // Limit each IP to 500 requests per windowMs
            message: 'Muitas requisições deste IP, tente novamente mais tarde.',
            standardHeaders: true,
            legacyHeaders: false,
        }),
    );

    app.enableCors({
        origin: true,
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    });

    // Default Uploads (App Internal)
    app.useStaticAssets(join(__dirname, '..', 'uploads'), {
        prefix: '/uploads/',
    });

    // External Images Repository (User Request)
    // Serve files from G:/Ranking DBV/IMAGENS at /imagens/ URL path
    app.useStaticAssets('G:/Ranking DBV/IMAGENS', {
        prefix: '/imagens/',
    });

    app.useGlobalPipes(new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: false,
    }));

    // Swagger Documentation
    const config = new DocumentBuilder()
        .setTitle('Ranking DBV API')
        .setDescription('API documentation for Ranking DBV system')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    await app.listen(3000, '0.0.0.0');
    console.log(`Application is running on: ${await app.getUrl()}`);
    console.log(`Swagger Docs available at: ${await app.getUrl()}/api/docs`);
}
bootstrap();
