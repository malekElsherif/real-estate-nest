import { PartialType } from '@nestjs/mapped-types';
import { CreateRentalRequestDto } from './create-rental-request.dto';

export class UpdateRentalRequestDto extends PartialType(
  CreateRentalRequestDto,
) {}
