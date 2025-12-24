import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { RequirementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class UpdateRequirementDto {
    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    code?: string;

    @IsOptional()
    @IsString()
    area?: string;

    @IsEnum(RequirementType)
    @IsOptional()
    type?: RequirementType;

    @IsArray()
    @IsOptional()
    @Type(() => CreateQuestionDto)
    questions?: CreateQuestionDto[];
}
