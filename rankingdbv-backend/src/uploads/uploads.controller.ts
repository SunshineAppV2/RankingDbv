
import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import * as fs from 'fs';

const uploadDir = 'G:/Ranking DBV/IMAGENS';

const storage = diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(uploadDir)) {
            try {
                fs.mkdirSync(uploadDir, { recursive: true });
            } catch (err: any) {
                console.error('Error creating upload directory:', err);
                // @ts-ignore - Multer types can be tricky
                return cb(err, uploadDir);
            }
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
    }
});

@Controller('uploads')
export class UploadsController {
    @Post()
    @UseInterceptors(FileInterceptor('file', {
        storage,
        limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
    }))
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Nenhum arquivo enviado ou erro no upload.');
        }

        return {
            url: `/imagens/${file.filename}`,
            filename: file.filename,
            originalName: file.originalname,
        };
    }
}
