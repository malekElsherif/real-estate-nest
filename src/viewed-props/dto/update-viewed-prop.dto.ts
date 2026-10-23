import { PartialType } from '@nestjs/swagger';
import { CreateViewedPropDto } from './create-viewed-prop.dto';

export class UpdateViewedPropDto extends PartialType(CreateViewedPropDto) {}
