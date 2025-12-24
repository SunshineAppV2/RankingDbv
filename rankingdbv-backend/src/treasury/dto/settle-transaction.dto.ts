import { IsDateString, IsNotEmpty } from 'class-validator';

export class SettleTransactionDto {
    @IsDateString()
    @IsNotEmpty()
    paymentDate: string;
}
