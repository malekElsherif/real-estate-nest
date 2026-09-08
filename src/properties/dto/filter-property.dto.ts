import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class FilterPropertyDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsIn(['SALE', 'RENT'])
  type?: string;

  @IsOptional()
  @IsIn(['AVAILABLE', 'SOLD', 'RENTED', 'PENDING'])
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxPrice?: number;
}
