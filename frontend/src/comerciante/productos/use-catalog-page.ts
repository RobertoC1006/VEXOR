import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { usePageState } from '../../compartido/componentes/pagination';
import type { Page } from '../../compartido/tipos/types';

export function useCatalogPage<T, Extra extends object = object>(
  path: string,
  categoryId?: string,
  localId?: string,
) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [codeSearch, setCodeSearch] = useState(false);
  const pagination = usePageState(`${path}:${categoryId ?? ''}:${localId ?? ''}`);
  const { offset, setOffset, pageSize } = pagination;
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
  if (query) params.set(codeSearch ? 'codigo' : 'q', query);
  if (localId) params.set('local_id', localId);
  if (categoryId) params.set('categoria_id', categoryId);
  const url = `${path}?${params}`;
  const resource = useResource(url, (signal) => api<Page<T> & Extra>(url, { signal }));
  function find(value: string, byCode: boolean) {
    const next = value.trim();
    setSearch(next);
    if (next === query && byCode === codeSearch && offset === 0) void resource.refresh();
    else {
      setOffset(0);
      setQuery(next);
      setCodeSearch(byCode);
    }
  }
  return {
    ...resource,
    search,
    setSearch,
    ...pagination,
    find: () => find(search, false),
    findCode: (code: string) => find(code, true),
  };
}
