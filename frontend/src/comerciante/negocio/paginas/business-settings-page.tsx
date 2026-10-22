import { useState } from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeading } from '../../../compartido/componentes/feedback';
import { Button } from '../../../compartido/componentes/ui';
import { useBusiness } from '../context';
import { BusinessInfoForm } from '../business-info-form';
import { PreferencesForm } from '../preferences-form';
import { LocalsPage } from '../../locales/paginas/locals-page';
const steps = ['Negocio', 'Puestos', 'Preferencias', 'Listo'];
export function BusinessSettingsPage() {
  const { base, business } = useBusiness();
  const [step, setStep] = useState(0);
  return (
    <>
      <PageHeading
        title="Configura tu negocio"
        description="Prepara tu información, tus puestos y la forma de registrar tu mercadería."
      />
      <nav className="setup-steps" aria-label="Pasos de configuración">
        {steps.map((label, i) => (
          <button
            key={label}
            type="button"
            aria-current={step === i ? 'step' : undefined}
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {label}
          </button>
        ))}
      </nav>
      <div hidden={step !== 0}>
        <BusinessInfoForm onContinue={() => setStep(1)} />
      </div>
      {step === 1 && (
        <>
          <div className="onboarding-step-note">
            <p>
              Indica el <strong>mercado, pabellón y número</strong> de cada puesto. Los almacenes
              pueden tener otra ubicación.
            </p>
          </div>
          <LocalsPage embedded />
          <Button onClick={() => setStep(2)}>Siguiente: preferencias</Button>
        </>
      )}
      {step === 2 && <PreferencesForm onContinue={() => setStep(3)} />}
      {step === 3 && (
        <section className="panel onboarding-complete">
          <CheckCircle size={42} />
          <h2>Revisa tu configuración</h2>
          <p>{business.nombre}</p>
          <p className="muted">
            Los datos se guardan en cada paso. Revisa que tus puestos y preferencias estén completos
            antes de empezar.
          </p>
          <Link className="button primary" to={`${base}/productos`}>
            Ir al catálogo de productos
          </Link>
        </section>
      )}
      {step > 0 && (
        <Button variant="ghost" onClick={() => setStep(step - 1)}>
          <ChevronLeft size={17} />
          Volver
        </Button>
      )}
    </>
  );
}
