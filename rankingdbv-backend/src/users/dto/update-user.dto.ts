
import { IsString, IsOptional, IsEmail, IsEnum, IsNotEmpty, IsBoolean, IsDateString, IsArray } from 'class-validator';

export class UpdateUserDto {
    @IsString()
    @IsOptional()
    @IsNotEmpty()
    name?: string;

    @IsEmail()
    @IsOptional()
    email?: string;

    @IsString()
    @IsOptional()
    password?: string;

    @IsString()
    @IsOptional()
    photoUrl?: string;

    @IsString()
    @IsOptional()
    role?: string;

    @IsOptional()
    @IsArray()
    secondaryRoles?: string[];

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

    @IsString()
    @IsOptional()
    status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';

    @IsBoolean()
    @IsOptional()
    mustChangePassword?: boolean;

    @IsString()
    @IsOptional()
    dbvClass?: string;

    @IsString()
    @IsOptional()
    clubId?: string;

    @IsString()
    @IsOptional()
    unitId?: string;

    // Extended Profile
    @IsString() @IsOptional() sex?: string;
    @IsDateString() @IsOptional() birthDate?: string;
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

    @IsOptional() pointsHistory?: any;
}
