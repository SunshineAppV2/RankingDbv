import { IsNotEmpty, IsUUID, IsString, IsOptional } from 'class-validator';

export class ScoreDto {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    @IsOptional()
    unitId?: string;

    @IsString()
    @IsNotEmpty()
    activityId: string;
}
