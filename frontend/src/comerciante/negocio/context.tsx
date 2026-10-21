import { createContext, useContext, type ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../compartido/api/api';
import { useResource } from '../../compartido/api/use-resource';
import { ResourceState } from '../../compartido/componentes/feedback';
import type { Access, BusinessDetail } from './types';

interface BusinessContext {
  business: BusinessDetail;
  access: Access;
  base: string;
  can: (permission: string) => boolean;
  refresh: () => Promise<unknown>;
}
const Context = createContext<BusinessContext | null>(null);
export function BusinessProvider({ children }: { children: ReactNode }) {
  const { negocioId } = useParams();
  const base = `/negocios/${negocioId}`;
  const resource = useResource(base, async (signal) => {
    const [business, access] = await Promise.all([
      api<BusinessDetail>(base, { signal }),
      api<Access>(`${base}/acceso?limit=1`, { signal }),
    ]);
    return { business, access };
  });
  if (!resource.data) return <ResourceState error={resource.error} retry={resource.refresh} />;
  const { business, access } = resource.data;
  return (
    <Context.Provider
      value={{
        business,
        access,
        base,
        can: (permission) =>
          access.es_propietario ||
          access.acciones.some(
            (action) => action.codigo === permission && action.permitido === true,
          ),
        refresh: resource.refresh,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useBusiness() {
  const context = useContext(Context);
  if (!context) throw new Error('Falta el contexto del negocio');
  return context;
}
