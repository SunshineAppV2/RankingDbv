import { IsString, IsNotEmpty, IsDate, IsOptional, IsNumber, IsUUID } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class CreateMeetingDto {
    @IsString()
    @IsNotEmpty()
    title: string;

    @Transform(({ value }) => {
        if (typeof value === 'string') {
            // Check for DD/MM/YYYY format
            if (value.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = value.split('/');
                return new Date(Number(year), Number(month) - 1, Number(day));
            }
            return new Date(value);
        }
        return value;
    })
    @IsDate()
    @IsNotEmpty()
    date: Date;

    @IsString()
    @IsOptional()
    type?: string;

    @IsNumber()
    @IsOptional()
    @Type(() => Number)
    points?: number;

    @IsOptional()
    isScoring?: boolean;

    @IsString()
    @IsNotEmpty()
    clubId: string;
}
