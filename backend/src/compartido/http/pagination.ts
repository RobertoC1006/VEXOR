export interface Pagination {
  limit: number;
  offset: number;
}

/** Las consultas traen una fila adicional, siempre después de aplicar autorización/RLS. */
export function page<T>(rows: T[], pagination: Pagination) {
  return {
    items: rows.slice(0, pagination.limit),
    limit: pagination.limit,
    offset: pagination.offset,
    has_more: rows.length > pagination.limit,
  };
}
