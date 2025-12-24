import { IsArray, IsString } from 'class-validator';

export class AttendanceDto {
    @IsArray()
    @IsString({ each: true })
    userIds: string[];
}
