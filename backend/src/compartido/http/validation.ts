import { applyDecorators } from '@nestjs/common';

import { Transform } from 'class-transformer';
import { IsISO8601, IsString, Length, Matches, ValidateIf } from 'class-validator';

export const TrimmedText = (max: number) =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    IsString(),
    Length(1, max),
  );

export const OptionalField = () => ValidateIf((_object, value: unknown) => value !== undefined);

export const Instant = () =>
  applyDecorators(
    IsISO8601({ strict: true }),
    Matches(/T.*(?:Z|[+-]\d{2}:\d{2})$/i, {
      message: 'La fecha debe incluir hora y zona horaria (Z o ±HH:MM)',
    }),
  );
