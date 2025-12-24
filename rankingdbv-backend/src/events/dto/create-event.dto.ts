import { IsString, IsNotEmpty, IsOptional, IsDateString, IsBoolean, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @IsDate()
    @Type(() => Date)
    startDate: Date;

    @IsDate()
    @Type(() => Date)
    endDate: Date;

    @IsNumber()
    cost: number;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    location?: string;

    @IsBoolean()
    @IsOptional()
    isScoring?: boolean;

    @IsNumber()
    @IsOptional()
    points?: number;

    @IsString()
    @IsOptional()
    clubId: string;
}
