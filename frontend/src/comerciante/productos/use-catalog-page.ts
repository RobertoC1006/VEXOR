import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import type { Page } from '../../compartido/tipos/types';

export function useCatalogPage<T, Extra extends object = object>(path: string) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const params = new URLSearchParams({ limit: '25', offset: String(offset) });
  if (query) params.set('q', query);
  const url = `${path}?${params}`;
  const resource = useResource(url, (signal) => api<Page<T> & Extra>(url, { signal }));
  return {
    ...resource,
    search,
    setSearch,
    offset,
    setOffset,
    find: () => {
      const next = search.trim();
      if (next === query && offset === 0) void resource.refresh();
      else {
        setOffset(0);
        setQuery(next);
      }
    },
  };
}
