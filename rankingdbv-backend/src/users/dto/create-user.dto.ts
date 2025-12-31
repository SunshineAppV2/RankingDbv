import { IsString, IsEmail, IsOptional, IsBoolean, IsEnum, IsArray, IsDateString } from 'class-validator';

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
    @IsEnum(['OWNER', 'ADMIN', 'INSTRUCTOR', 'COUNSELOR', 'PARENT', 'PATHFINDER', 'COORDINATOR_REGIONAL', 'MASTER', 'DIRECTOR', 'COORDINATOR_AREA', 'COORDINATOR_DISTRICT'])
    role?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsBoolean()
    @IsOptional()
    mustChangePassword?: boolean;

    // Config for Coordinator / New Club
    @IsString() @IsOptional() clubName?: string;
    @IsString() @IsOptional() region?: string;
    @IsString() @IsOptional() mission?: string;
    @IsString() @IsOptional() union?: string;
    @IsString() @IsOptional() district?: string;
    @IsString() @IsOptional() association?: string;

    // Extended Profile
    @IsString() @IsOptional() sex?: string;
    @IsString() @IsOptional() birthDate?: string;
    @IsString() @IsOptional() maritalStatus?: string;
    @IsString() @IsOptional() phone?: string;
    @IsString() @IsOptional() mobile?: string;
    @IsBoolean() @IsOptional() isBaptized?: boolean;
    @IsString() @IsOptional() rg?: string;
    @IsString() @IsOptional() issuingOrg?: string;
    @IsString() @IsOptional() cpf?: string;
    @IsString() @IsOptional() shirtSize?: string;

    @IsString() @IsOptional() address?: string;
    @IsString() @IsOptional() addressNumber?: string;
    @IsString() @IsOptional() neighborhood?: string;
    @IsString() @IsOptional() cep?: string;
    @IsString() @IsOptional() city?: string;
    @IsString() @IsOptional() state?: string;
    @IsString() @IsOptional() complement?: string;

    @IsString() @IsOptional() educationLevel?: string;
    @IsString() @IsOptional() educationStatus?: string;
    @IsString() @IsOptional() knowledgeArea?: string;
    @IsString() @IsOptional() courseName?: string;
    @IsString() @IsOptional() institution?: string;
    @IsString() @IsOptional() schoolShift?: string;

    @IsBoolean() @IsOptional() isHealthProfessional?: boolean;
    @IsString() @IsOptional() healthProfessionalType?: string;

    @IsString() @IsOptional() fatherName?: string;
    @IsString() @IsOptional() fatherEmail?: string;
    @IsString() @IsOptional() fatherPhone?: string;
    @IsString() @IsOptional() motherName?: string;
    @IsString() @IsOptional() motherEmail?: string;
    @IsString() @IsOptional() motherPhone?: string;

    @IsString() @IsOptional() emergencyName?: string;
    @IsString() @IsOptional() emergencyPhone?: string;
    @IsString() @IsOptional() emergencyRelation?: string;

    // Medical Record
    @IsString() @IsOptional() susNumber?: string;
    @IsString() @IsOptional() healthPlan?: string;
    @IsString() @IsOptional() bloodType?: string;
    @IsString() @IsOptional() rhFactor?: string;

    @IsArray() @IsOptional() diseasesHistory?: string[];

    @IsBoolean() @IsOptional() hasHeartProblem?: boolean;
    @IsString() @IsOptional() heartProblemDesc?: string;

    @IsBoolean() @IsOptional() hasDiabetes?: boolean;
    @IsBoolean() @IsOptional() hasRenalProblem?: boolean;
    @IsBoolean() @IsOptional() hasPsychProblem?: boolean;

    @IsString() @IsOptional() regularMedications?: string;
    @IsString() @IsOptional() specificAllergies?: string;

    @IsString() @IsOptional() recentTrauma?: string;
    @IsString() @IsOptional() recentFracture?: string;
    @IsString() @IsOptional() recentSurgery?: string;

    @IsArray() @IsOptional() disabilities?: string[];

    @IsString() @IsOptional() healthNotes?: string;

    @IsArray() @IsOptional() childrenIds?: string[];
}
