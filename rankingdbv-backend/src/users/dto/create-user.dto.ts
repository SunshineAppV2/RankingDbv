import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';

export class CreateUserDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;

    @IsString()
    password: string;

    @IsString()
    @IsOptional()
    clubId?: string;

    @IsString()
    @IsOptional()
    unitId?: string;

    @IsString()
    @IsOptional()
    dbvClass?: string;

    @IsOptional()
    @IsEnum(['OWNER', 'ADMIN', 'INSTRUCTOR', 'COUNSELOR', 'PARENT', 'PATHFINDER', 'REGIONAL'])
    role?: 'OWNER' | 'ADMIN' | 'INSTRUCTOR' | 'COUNSELOR' | 'PARENT' | 'PATHFINDER' | 'REGIONAL';

    @IsOptional()
    @IsArray()
    @IsEnum(['OWNER', 'ADMIN', 'INSTRUCTOR', 'COUNSELOR', 'PARENT', 'PATHFINDER', 'REGIONAL'], { each: true })
    secondaryRoles?: ('OWNER' | 'ADMIN' | 'INSTRUCTOR' | 'COUNSELOR' | 'PARENT' | 'PATHFINDER' | 'REGIONAL')[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    // Config for New Club
    @IsString()
    @IsOptional()
    clubName?: string;

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
