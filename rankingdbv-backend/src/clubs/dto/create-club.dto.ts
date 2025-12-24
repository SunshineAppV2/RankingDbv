import { IsString, IsOptional } from 'class-validator';

export class CreateClubDto {
    @IsString()
    name: string;

    @IsString()
    @IsOptional()
    region?: string;

    @IsString()
    @IsOptional()
    mission?: string;

    @IsString()
    @IsOptional()
    union?: string;
}
