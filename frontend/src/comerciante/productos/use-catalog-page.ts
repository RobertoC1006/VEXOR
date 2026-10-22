import { useBusiness } from '../negocio/context';
import { useState } from 'react';
import { api } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { usePageState } from '../../compartido/componentes/pagination';
import type { Page } from '../../compartido/tipos/types';

export function useCatalogPage<T, Extra extends object = object>(
  path: string,
  categoryId?: string,
  localId?: string,
  inventoryFilter?: { productId?: string; status?: string },
) {
  const { business } = useBusiness();
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [codeSearch, setCodeSearch] = useState(false);
  const pagination = usePageState(
    `${path}:${categoryId ?? ''}:${localId ?? ''}:${inventoryFilter?.productId ?? ''}:${inventoryFilter?.status ?? ''}`,
    business?.preferencias?.elementos_por_pagina,
  );
  const { offset, setOffset, pageSize } = pagination;
  const params = new URLSearchParams({ limit: String(pageSize), offset: String(offset) });
  if (query) params.set(codeSearch ? 'codigo' : 'q', query);
  if (localId) params.set('local_id', localId);
  if (inventoryFilter?.productId) params.set('producto_id', inventoryFilter.productId);
  if (inventoryFilter?.status) params.set('estado_stock', inventoryFilter.status);
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
