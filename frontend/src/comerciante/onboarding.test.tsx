import type { ReactNode } from 'react';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { it, expect, vi, beforeEach, afterEach } from 'vitest';
const mock = vi.hoisted(() => ({
  api: vi.fn(),
  listAll: vi.fn(),
  refresh: vi.fn(),
  updateBusiness: vi.fn(),
  business: {
    id: 'A',
    nombre: 'Negocio invitado',
    rubro: null as string | null,
    zona_horaria: 'America/Lima',
    activo: true,
    onboarding_paso: 0,
  },
  owner: true,
}));
vi.mock('../compartido/api/api', () => ({ api: mock.api, listAll: mock.listAll }));
vi.mock('./negocio/context', () => ({
  BusinessProvider: ({ children }: { children: ReactNode }) => children,
  useBusiness: () => ({
    base: '/negocios/A',
    business: mock.business,
    access: { es_propietario: mock.owner },
    can: () => true,
    refresh: mock.refresh,
  }),
}));
vi.mock('../compartido/acceso/workspace', () => ({
  useWorkspace: () => ({ updateBusiness: mock.updateBusiness }),
}));
vi.mock('../compartido/layouts/app-layout', () => ({
  AppLayout: ({ children, navigation }: { children: ReactNode; navigation: ReactNode }) => (
    <>
      {navigation}
      {children}
    </>
  ),
}));
import { BusinessInfoForm } from './negocio/business-info-form';
import { OnboardingPage } from './negocio/paginas/onboarding-page';
import { BusinessArea } from './area';
beforeEach(() => {
  vi.clearAllMocks();
  mock.owner = true;
  mock.business.onboarding_paso = 0;
  mock.business.rubro = null;
  mock.api.mockResolvedValue({ ...mock.business });
  mock.refresh.mockResolvedValue(undefined);
  mock.listAll.mockResolvedValue([
    {
      id: 'L',
      nombre: 'Puesto inicial',
      activo: true,
      habilitado_venta: true,
      mercado: 'Mercado QA',
      pabellon: 'A',
      numero_puesto: '15',
    },
  ]);
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('el inicio tiene tres pasos sin preferencias y exige rubro antes de Siguiente', () => {
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
  expect(screen.getByRole('button', { name: 'Siguiente' }).hasAttribute('disabled')).toBe(true);
  expect(screen.getByLabelText('Rubro del negocio').hasAttribute('required')).toBe(true);
  expect(screen.queryByRole('button', { name: /Preferencias/ })).toBeNull();
  expect(screen.getByRole('button', { name: 'Paso 3: Listo' })).toBeTruthy();
});
it('Siguiente guarda la ficha antes de avanzar; un error conserva los campos', async () => {
  const next = vi.fn();
  mock.api.mockRejectedValueOnce(new Error('Sin conexión'));
  render(
    <MemoryRouter>
      <BusinessInfoForm onContinue={next} />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Rubro del negocio'), { target: { value: 'Lencería' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await screen.findByText('Sin conexión');
  expect(next).not.toHaveBeenCalled();
  expect((screen.getByLabelText('Rubro del negocio') as HTMLInputElement).value).toBe('Lencería');
  mock.api.mockResolvedValue({ ...mock.business });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(next).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[1][1].body).rubro).toBe('Lencería');
});
it('reanuda la revisión guardada y muestra el negocio y sus locales antes de terminar', async () => {
  mock.business.onboarding_paso = 2;
  mock.business.rubro = 'Lencería';
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
  await screen.findByText(/Mercado QA · A · N.º 15/);
  expect(screen.getByText('Negocio invitado')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: /Empezar a trabajar/ }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/onboarding',
      expect.objectContaining({ body: JSON.stringify({ paso: 3 }) }),
    ),
  );
});
it('una URL directa de productos redirige al asistente sin montar el catálogo', () => {
  render(
    <MemoryRouter initialEntries={['/negocios/A/productos']}>
      <Routes>
        <Route path="/negocios/:negocioId" element={<BusinessArea />}>
          <Route path="productos" element={<h1>Catálogo prohibido antes de terminar</h1>} />
          <Route path="onboarding" element={<h1>Configuración inicial</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Configuración inicial')).toBeTruthy();
  expect(screen.queryByText('Catálogo prohibido antes de terminar')).toBeNull();
});
it('un trabajador espera al propietario y no recibe el formulario de configuración', () => {
  mock.owner = false;
  render(
    <MemoryRouter>
      <BusinessArea />
    </MemoryRouter>,
  );
  expect(screen.getByText(/El propietario está preparando/)).toBeTruthy();
  expect(screen.queryByText('Configurar mi negocio')).toBeNull();
});
it('el negocio completado conserva el acceso normal a los módulos', () => {
  mock.business.onboarding_paso = 3;
  render(
    <MemoryRouter initialEntries={['/negocios/A/productos']}>
      <Routes>
        <Route path="/negocios/:negocioId" element={<BusinessArea />}>
          <Route path="productos" element={<h1>Catálogo listo</h1>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText('Catálogo listo')).toBeTruthy();
});
it('el primer puesto se crea desde Siguiente con venta habilitada por defecto', async () => {
  mock.business.onboarding_paso = 1;
  mock.business.rubro = 'Lencería';
  mock.listAll.mockResolvedValue([]);
  render(
    <MemoryRouter>
      <OnboardingPage />
    </MemoryRouter>,
  );
  const name = await screen.findByLabelText('Nombre del local');
  fireEvent.change(name, { target: { value: 'Mi puesto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() =>
    expect(mock.api).toHaveBeenCalledWith(
      '/negocios/A/onboarding',
      expect.objectContaining({ body: JSON.stringify({ paso: 2 }) }),
    ),
  );
  const localCall = mock.api.mock.calls.find((call) => call[0] === '/negocios/A/locales');
  expect(JSON.parse(localCall![1].body).habilitado_venta).toBe(true);
});
