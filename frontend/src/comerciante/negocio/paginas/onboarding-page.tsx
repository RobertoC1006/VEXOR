import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ArrowRight, Store } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { api, listAll } from '../../../compartido/api/api';
import { useResource } from '../../../compartido/api/use-resource';
import { useAction } from '../../../compartido/api/use-action';
import {
  PageHeading,
  ResourceState,
  ActionFeedback,
} from '../../../compartido/componentes/feedback';
import { Button } from '../../../compartido/componentes/ui';
import { BusinessInfoForm } from '../business-info-form';
import { useBusiness } from '../context';
import { LocalsPage } from '../../locales/paginas/locals-page';
import { LocalForm } from '../../locales/componentes/local-form';
import { ClientPager, useClientPage } from '../../../compartido/componentes/pagination';
import type { BusinessLocal } from '../../locales/types';
import { formatLocation } from '../../locales/location';
const steps = ['Tu negocio', 'Puestos y almacenes', 'Listo'];
export function OnboardingPage() {
  const { business, base, refresh } = useBusiness();
  const [step, setStep] = useState(Math.min(business.onboarding_paso ?? 0, 2));
  const action = useAction();
  const resource = useResource(`${base}/onboarding-locales:${step}`, (signal) =>
    listAll<BusinessLocal>(`${base}/locales`, signal),
  );
  const localsPage = useClientPage((resource.data ?? []).filter((l) => l.activo));
  if ((business.onboarding_paso ?? 3) === 3) return <Navigate to={base} replace />;
  async function advance(next: number) {
    await api(`${base}/onboarding`, { method: 'POST', body: JSON.stringify({ paso: next }) });
    await refresh();
    setStep(Math.min(next, 2));
    window.scrollTo(0, 0);
  }
  return (
    <div className="onboarding-flow">
      <PageHeading
        eyebrow="BIENVENIDO A VEXOR"
        title="Hagamos espacio para tu negocio"
        description="Solo lo esencial para empezar. Los demás detalles pueden esperar."
      />
      <nav className="setup-steps" aria-label="Pasos para empezar">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-label={`Paso ${i + 1}: ${label}`}
            disabled={i > step || action.busy}
            aria-current={i === step ? 'step' : undefined}
            onClick={() => setStep(i)}
          >
            <span>{i < step ? <CheckCircle2 size={18} /> : i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      {step === 0 && <BusinessInfoForm onContinue={() => advance(1)} />}
      {step === 1 && (
        <>
          <div className="onboarding-step-note">
            <Store size={22} />
            <div>
              <h2>¿Dónde vas a trabajar?</h2>
              <p>
                Empieza con un puesto de venta. Añade un almacén solo si lo necesitas. La ubicación
                se registra en cada local.
              </p>
              <small>Plan básico: un puesto activo para venta.</small>
            </div>
          </div>
          {!resource.data ? (
            <ResourceState error={resource.error} retry={resource.refresh} />
          ) : !resource.data.length ? (
            <LocalForm
              defaultSale
              submitLabel="Siguiente"
              cancelLabel="Volver"
              onCancel={() => setStep(0)}
              onSaved={async () => {
                await resource.refresh();
                await action.run(() => advance(2), '');
              }}
            />
          ) : (
            <>
              <LocalsPage embedded />
              <div className="form-actions">
                <Button variant="secondary" disabled={action.busy} onClick={() => setStep(0)}>
                  <ChevronLeft size={17} />
                  Volver
                </Button>
                <Button busy={action.busy} onClick={() => void action.run(() => advance(2), '')}>
                  Siguiente
                  <ArrowRight size={17} />
                </Button>
              </div>
            </>
          )}
          <ActionFeedback {...action} />
        </>
      )}
      {step === 2 && (
        <section className="panel onboarding-review">
          <span className="review-check">
            <CheckCircle2 size={32} />
          </span>
          <h2>Tu negocio está tomando forma</h2>
          <p className="muted">
            Revisa lo que preparaste. Puedes volver a cualquier paso para corregirlo.
          </p>
          <div className="review-business">
            {business.foto && (
              <img className="product-photo" src={business.foto} alt={business.nombre} />
            )}
            <div>
              <h3>{business.nombre}</h3>
              <p>{business.rubro}</p>
              {business.descripcion && <p className="muted">{business.descripcion}</p>}
            </div>
            <Button variant="ghost" onClick={() => setStep(0)}>
              Editar negocio
            </Button>
          </div>
          {!resource.data ? (
            <ResourceState error={resource.error} retry={resource.refresh} />
          ) : (
            <div className="review-locals">
              <h3>Tus puestos y almacenes</h3>
              <ClientPager page={localsPage} />
              {localsPage.items.map((l) => (
                <article key={l.id}>
                  <div>
                    <strong>{l.nombre}</strong>
                    <p>
                      {l.habilitado_venta ? 'Puesto de venta' : 'Almacén'} ·{' '}
                      {formatLocation(l) || 'Ubicación por completar (opcional)'}
                    </p>
                  </div>
                </article>
              ))}
              <Button variant="ghost" onClick={() => setStep(1)}>
                Editar locales
              </Button>
            </div>
          )}
          <p className="onboarding-review-note">
            Podrás cambiar tus datos en Mi negocio y administrar tus locales en Puestos y almacenes.
            Las preferencias se pueden ajustar después.
          </p>
          <ActionFeedback {...action} />
          <div className="form-actions">
            <Button variant="secondary" disabled={action.busy} onClick={() => setStep(1)}>
              <ChevronLeft size={17} />
              Volver
            </Button>
            <Button
              busy={action.busy}
              disabled={!resource.data}
              onClick={() => void action.run(() => advance(3), '')}
            >
              Empezar a trabajar
              <ArrowRight size={17} />
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
