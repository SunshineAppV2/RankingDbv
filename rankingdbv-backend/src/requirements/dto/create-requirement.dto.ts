
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsArray } from 'class-validator';
import { DBVClass, RequirementType } from '@prisma/client';
import { Type } from 'class-transformer';
import { CreateQuestionDto } from './create-question.dto';

export class CreateRequirementDto {
    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsOptional()
    code?: string;

    @IsString()
    @IsOptional()
    dbvClass?: DBVClass;

    @IsString()
    @IsOptional()
    specialtyId?: string;

    @IsString()
    @IsOptional()
    area?: string;

    @IsString()
    @IsOptional()
    clubId?: string;

    @IsEnum(RequirementType)
    @IsOptional()
    type?: RequirementType;

    @IsArray()
    @IsOptional()
    @Type(() => CreateQuestionDto)
    questions?: CreateQuestionDto[];
}
