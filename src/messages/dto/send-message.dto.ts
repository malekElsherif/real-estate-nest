import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class SendMessageDto {
  @Type(() => Number)
  @IsInt()
  receiverId!: number;

  @IsString()
  @IsNotEmpty()
  content!: string;
}
