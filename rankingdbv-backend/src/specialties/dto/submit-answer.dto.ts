import { IsNotEmpty, IsOptional, IsString, IsUrl, IsUUID } from 'class-validator';

export class SubmitAnswerDto {
    @IsUUID()
    @IsNotEmpty()
    requirementId: string;

    @IsString()
    @IsOptional()
    text?: string;

    @IsUrl()
    @IsOptional()
    fileUrl?: string; // Could be a file path or URL
}
