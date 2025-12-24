import { IsString, IsArray, IsNumber, ArrayMinSize, IsNotEmpty } from 'class-validator';

export class CreateQuestionDto {
    @IsString()
    @IsNotEmpty()
    questionText: string;

    @IsArray()
    @ArrayMinSize(2)
    @IsString({ each: true })
    options: string[];

    @IsNumber()
    correctIndex: number;
}
