import { PartialType } from '@nestjs/swagger';
import { CreateHelpWantedDto } from './create-help-wanted.dto';

export class UpdateHelpWantedDto extends PartialType(CreateHelpWantedDto) {}
