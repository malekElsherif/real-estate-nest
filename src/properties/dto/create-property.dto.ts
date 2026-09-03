import { IsEnum, IsNumber, IsString } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsNumber()
  price!: number;

  @IsString()
  city!: string;

  @IsString()
  address!: string;

  @IsNumber()
  area!: number;

  @IsNumber()
  bedrooms!: number;

  @IsNumber()
  bathrooms!: number;

  @IsEnum(['SALE', 'RENT'])
  type!: string;
}
