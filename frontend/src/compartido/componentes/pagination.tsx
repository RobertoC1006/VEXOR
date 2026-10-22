import { useEffect, useState } from 'react';
import { Button } from './ui';
import { SelectField } from './form-controls';

export function usePageState(resetKey = '') {
  const [offset, setOffset] = useState(0);
  const [pageSize, setSize] = useState(5);
  useEffect(() => {
    setOffset(0);
  }, [resetKey]);
  function setPageSize(size: number) {
    setSize(size === 10 ? 10 : 5);
    setOffset(0);
  }
  return { offset, setOffset, pageSize, setPageSize };
}
export function useClientPage<T>(items: readonly T[], resetKey = '') {
  const state = usePageState(resetKey);
  const offset = Math.min(
    state.offset,
    Math.max(0, Math.ceil(items.length / state.pageSize) - 1) * state.pageSize,
  );
  return {
    ...state,
    offset,
    items: items.slice(offset, offset + state.pageSize),
    more: offset + state.pageSize < items.length,
    total: items.length,
  };
}
export function Pagination({
  offset,
  pageSize,
  more,
  loading = false,
  onChange,
  onPageSize,
  total,
}: {
  offset: number;
  pageSize: number;
  more: boolean;
  loading?: boolean;
  onChange: (offset: number) => void;
  onPageSize: (size: number) => void;
  total?: number;
}) {
  if (total !== undefined && total <= 5) return null;
  return (
    <nav className="list-pagination" aria-label="Paginación">
      <SelectField
        label="Elementos por página"
        value={pageSize}
        disabled={loading}
        onChange={(e) => onPageSize(Number(e.target.value))}
      >
        <option value={5}>5</option>
        <option value={10}>10</option>
      </SelectField>
      <div className="page-controls">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || offset === 0}
          onClick={() => onChange(Math.max(0, offset - pageSize))}
        >
          Anterior
        </Button>
        <span aria-live="polite">
          Página {Math.floor(offset / pageSize) + 1}
          {total === undefined ? '' : ` de ${Math.max(1, Math.ceil(total / pageSize))}`}
        </span>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || !more}
          onClick={() => onChange(offset + pageSize)}
        >
          Siguiente
        </Button>
      </div>
    </nav>
  );
}
export function ClientPager<T>({ page }: { page: ReturnType<typeof useClientPage<T>> }) {
  return <Pagination {...page} onChange={page.setOffset} onPageSize={page.setPageSize} />;
}
