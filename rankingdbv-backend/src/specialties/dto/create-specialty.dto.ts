import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateSpecialtyDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    area: string;

    @IsString()
    @IsOptional()
    imageUrl?: string;

    @IsOptional()
    requirements?: {
        description: string;
        type?: 'TEXT' | 'FILE';
    }[];
}
