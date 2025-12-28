import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class CreateProductDto {
    @IsString()
    name: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsNumber()
    price: number;

    @IsNumber()
    stock: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @IsOptional()
    @IsString()
    category?: string; // REAL, VIRTUAL
}
