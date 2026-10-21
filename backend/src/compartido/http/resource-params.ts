import { Param, ParseUUIDPipe } from '@nestjs/common';
export const BusinessId = () => Param('negocioId', new ParseUUIDPipe());
export const MemberId = () => Param('miembroId', new ParseUUIDPipe());
export const ResourceId = () => Param('id', new ParseUUIDPipe());
