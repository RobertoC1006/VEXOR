import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
const mock = vi.hoisted(() => ({
  api: vi.fn(),
  listAll: vi.fn(),
  refresh: vi.fn(),
  updateBusiness: vi.fn(),
  context: {
    base: '/negocios/A',
    business: { id: 'A', nombre: 'Comercial Aurora', zona_horaria: 'America/Lima', activo: true },
    access: { es_propietario: true, miembro_id: 'owner' },
    can: vi.fn(),
    refresh: vi.fn(),
  },
}));
vi.mock('../compartido/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../compartido/api/api')>()),
  api: mock.api,
  listAll: mock.listAll,
}));
vi.mock('./negocio/context', () => ({ useBusiness: () => mock.context }));
vi.mock('../compartido/acceso/workspace', () => ({
  useWorkspace: () => ({
    data: { me: { auth_user_id: 'test-owner' } },
    updateBusiness: mock.updateBusiness,
  }),
}));
import { ApiError } from '../compartido/api/api';
import { BusinessSettingsPage } from './negocio/paginas/business-settings-page';
import { LocalForm } from './locales/componentes/local-form';
import { MemberAccess } from './equipo/componentes/member-access';
import { PermissionEditor } from './equipo/componentes/permission-editor';
import { TeamInvitationForm } from './equipo/componentes/team-invitation-form';
import { TeamLayout } from './equipo/layout';

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  mock.context.base = '/negocios/A';
  mock.context.access.es_propietario = true;
  mock.context.can.mockReturnValue(true);
  mock.context.refresh.mockResolvedValue(undefined);
  mock.api.mockResolvedValue({});
  mock.listAll.mockResolvedValue([]);
});
afterEach(cleanup);
const local = {
  mercado: null,
  pabellon: null,
  numero_puesto: null,
  referencia: null,
  id: 'local',
  negocio_id: 'A',
  nombre: 'Puesto principal',
  habilitado_venta: true,
  activo: true,
  creado_en: '2026-01-01',
  actualizado_en: '2026-01-01',
};
it('consulta Mi negocio sin ofrecer edición a quien no tiene permiso', () => {
  mock.context.can.mockReturnValue(false);
  render(
    <MemoryRouter>
      <BusinessSettingsPage />
    </MemoryRouter>,
  );
  expect(screen.getByLabelText('Nombre del negocio').hasAttribute('disabled')).toBe(false);
  expect(
    (screen.getByLabelText('Nombre del negocio') as HTMLInputElement).matches(':disabled'),
  ).toBe(true);
  expect(screen.queryByRole('button', { name: 'Guardar cambios' })).toBeNull();
  expect(mock.api).not.toHaveBeenCalled();
});
it('guarda el negocio y actualiza el nombre compartido sin recargar la sesión', async () => {
  mock.api.mockResolvedValue({ ...mock.context.business, nombre: 'Flores y regalos' });
  render(
    <MemoryRouter>
      <BusinessSettingsPage />
    </MemoryRouter>,
  );
  fireEvent.change(screen.getByLabelText('Nombre del negocio'), {
    target: { value: ' Flores y regalos ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByText('Cambios guardados.');
  expect(mock.api).toHaveBeenCalledWith(
    '/negocios/A',
    expect.objectContaining({
      method: 'PATCH',
      body: JSON.stringify({ nombre: 'Flores y regalos', rubro: null }),
    }),
  );
  expect(mock.updateBusiness).toHaveBeenCalledWith('A', 'Flores y regalos');
});
it('pausar un local requiere confirmación y cancelar no envía cambios', async () => {
  render(<LocalForm local={local} onSaved={mock.refresh} onCancel={() => {}} />);
  fireEvent.click(screen.getByRole('checkbox', { name: /Local activo/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar local' }));
  const dialog = screen.getByRole('dialog');
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(mock.api).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar local' }));
  fireEvent.click(
    within(screen.getByRole('dialog')).getByRole('button', { name: 'Guardar local' }),
  );
  await waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual({
    nombre: 'Puesto principal',
    habilitado_venta: true,
    activo: false,
    mercado: null,
    pabellon: null,
    numero_puesto: null,
    referencia: null,
  });
});
it('guarda un rubro libre sin enviar zona horaria y muestra ubicaciones de sus locales', async () => {
  mock.listAll.mockResolvedValue([
    { ...local, mercado: 'Mercado Central', pabellon: 'B', numero_puesto: '024-A' },
  ]);
  mock.api.mockResolvedValue({ ...mock.context.business, rubro: 'Artesanía y regalos' });
  render(
    <MemoryRouter>
      <BusinessSettingsPage />
    </MemoryRouter>,
  );
  expect(screen.queryByLabelText('Zona horaria')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: /^2\s*Puestos$/ }));
  await screen.findByText('Mercado Central · B · N.º 024-A');
  fireEvent.click(screen.getByRole('button', { name: /^1\s*Negocio$/ }));
  fireEvent.change(screen.getByLabelText('Rubro del negocio'), {
    target: { value: ' Artesanía y regalos ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await screen.findByText('Cambios guardados.');
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual({
    nombre: 'Comercial Aurora',
    rubro: 'Artesanía y regalos',
  });
});
it('edita la ubicación sin cambiar el estado y permite retirar campos opcionales', async () => {
  render(
    <LocalForm
      local={{ ...local, mercado: 'Mercado Central', pabellon: 'B' }}
      onSaved={mock.refresh}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText('Pabellón o sector'), { target: { value: '' } });
  fireEvent.change(screen.getByLabelText('Número de puesto o local'), {
    target: { value: ' 024-A ' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar local' }));
  await waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
  expect(JSON.parse(mock.api.mock.calls[0][1].body)).toEqual({
    nombre: local.nombre,
    activo: true,
    habilitado_venta: true,
    mercado: 'Mercado Central',
    pabellon: null,
    numero_puesto: '024-A',
    referencia: null,
  });
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('un conflicto de local conserva el formulario y permite corregirlo', async () => {
  mock.api.mockRejectedValue(
    new ApiError(409, 'El plan básico permite un solo puesto activo para venta.'),
  );
  render(<LocalForm onSaved={mock.refresh} onCancel={() => {}} />);
  fireEvent.change(screen.getByLabelText('Nombre del local'), {
    target: { value: 'Puesto secundario' },
  });
  fireEvent.click(screen.getByRole('checkbox', { name: /Habilitado para vender/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Crear local' }));
  await screen.findByRole('alert');
  expect((screen.getByLabelText('Nombre del local') as HTMLInputElement).value).toBe(
    'Puesto secundario',
  );
  expect(mock.refresh).not.toHaveBeenCalled();
});
it('el rechazo de la baja del último propietario se muestra sin fingir un guardado', async () => {
  mock.api.mockRejectedValue(new ApiError(409, 'El negocio debe conservar un propietario activo.'));
  render(
    <MemberAccess
      member={{
        id: 'owner',
        usuario_id: 'u',
        nombre: 'Roberto',
        activo: true,
        es_propietario: true,
        creado_en: '2026-01-01',
      }}
      onSaved={mock.refresh}
    />,
  );
  fireEvent.click(screen.getByRole('checkbox', { name: /Acceso activo/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar acceso' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }));
  await screen.findByText('El negocio debe conservar un propietario activo.');
  expect(mock.refresh).not.toHaveBeenCalled();
  expect(screen.queryByText('Acceso actualizado.')).toBeNull();
});
it('editar una vigencia permite quitar el vencimiento sin cambiar identidad ni alcance', async () => {
  const permission = {
    id: 'grant',
    permiso_codigo: 'locales.ver',
    efecto: 'permitir' as const,
    local_id: 'local',
    inicia_en: '2020-01-01T00:00:00Z',
    vence_en: '2030-01-01T00:00:00Z',
    revocado_en: null,
    motivo: 'Campaña',
  };
  render(
    <PermissionEditor
      memberId="worker"
      permission={permission}
      permissions={[{ codigo: 'locales.ver', alcance: 'local', descripcion: 'Consultar local' }]}
      locals={[local]}
      onSaved={mock.refresh}
      onCancel={() => {}}
    />,
  );
  fireEvent.change(screen.getByLabelText(/Vencimiento/), { target: { value: '' } });
  fireEvent.click(screen.getByRole('button', { name: 'Guardar permiso' }));
  await waitFor(() => expect(mock.refresh).toHaveBeenCalledOnce());
  expect(mock.api).toHaveBeenCalledWith(
    '/negocios/A/miembros/worker/permisos/grant',
    expect.objectContaining({ method: 'PATCH' }),
  );
  const body = JSON.parse(mock.api.mock.calls[0][1].body);
  expect(body).toEqual({ efecto: 'permitir', motivo: 'Campaña', vence_en: null });
});
it('no monta las funciones de equipo sin permiso', () => {
  mock.context.can.mockReturnValue(false);
  render(
    <MemoryRouter>
      <TeamLayout />
    </MemoryRouter>,
  );
  expect(screen.getByRole('alert').textContent).toContain('Necesitas autorización');
  expect(mock.api).not.toHaveBeenCalled();
});
it('reintenta una invitación con la misma clave y datos, incluso tras remontar la pantalla', async () => {
  mock.api.mockRejectedValueOnce(new ApiError(0, 'Conexión interrumpida'));
  const view = render(<TeamInvitationForm onSaved={mock.refresh} />);
  fireEvent.change(screen.getByLabelText('Nombre de la persona'), { target: { value: 'Ana' } });
  fireEvent.change(screen.getByLabelText('Correo de invitación'), {
    target: { value: 'ana@example.test' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar invitación' }));
  await screen.findByText('Conexión interrumpida');
  const original = mock.api.mock.calls[0];
  view.unmount();
  mock.api.mockResolvedValue({ id: 'invitation', estado_envio: 'error' });
  render(<TeamInvitationForm onSaved={mock.refresh} />);
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar invitación' }));
  await screen.findByText(/La invitación quedó guardada, pero el correo/);
  expect(mock.api.mock.calls[1]).toEqual(original);
  expect(original[0]).toBe('/negocios/A/invitaciones');
});
