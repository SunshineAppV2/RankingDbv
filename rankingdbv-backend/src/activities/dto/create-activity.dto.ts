import { IsString, IsNotEmpty, IsNumber, IsOptional, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Type(() => Number)
    points: number;

    @IsString()
    @IsNotEmpty()
    clubId: string;

    @IsString()
    @IsOptional()
    type?: string;
}
