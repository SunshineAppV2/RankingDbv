import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export enum TransactionType {
    INCOME = 'INCOME',
    EXPENSE = 'EXPENSE'
}

export class CreateTransactionDto {
    @IsEnum(TransactionType)
    @IsNotEmpty()
    type: TransactionType;

    @IsNumber()
    @Type(() => Number)
    @IsNotEmpty()
    amount: number;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsString()
    @IsNotEmpty()
    category: string;

    @IsString()
    @IsOptional()
    payerId?: string;

    @IsString()
    @IsNotEmpty()
    clubId: string;

    @IsOptional()
    @Type(() => Date)
    date?: Date;

    @IsOptional()
    recurrence?: boolean;

    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    installments?: number;

    @IsOptional()
    @IsDateString()
    dueDate?: string;

    @IsOptional()
    @IsNumber()
    points?: number;

    @IsString()
    @IsOptional()
    memberId?: string;

    @IsOptional()
    isPaid?: boolean;
}
