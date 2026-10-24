import { ConflictException } from '@nestjs/common';
/** Expose only deliberate POS business conflicts, not internal constraint diagnostics. */
export async function posOperation<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    const pg = error as { code?: string; message?: string };
    if (pg.code === '23514' && pg.message && !pg.message.includes('constraint'))
      throw new ConflictException(pg.message);
    throw error;
  }
}
