import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { PageHeading } from '../../../compartido/componentes/feedback';
import { Button } from '../../../compartido/componentes/ui';
import { BusinessInfoForm } from '../business-info-form';
import { PreferencesForm } from '../preferences-form';
export function BusinessSettingsPage() {
  const [preferences, setPreferences] = useState(false);
  return (
    <>
      <PageHeading
        eyebrow="TU NEGOCIO"
        title="Mi negocio"
        description="Tu información y tus preferencias, en un solo lugar."
      />
      <BusinessInfoForm />
      <section className="panel preferences-entry">
        <div>
          <Settings2 size={24} />
          <h2>Preferencias de productos</h2>
          <p className="muted">
            Cuando conozcas tu catálogo, adapta los campos sugeridos y la forma de registrarlo.
          </p>
        </div>
        <Button
          variant="secondary"
          aria-expanded={preferences}
          onClick={() => setPreferences(!preferences)}
        >
          {preferences ? 'Cerrar preferencias' : 'Revisar preferencias'}
        </Button>
      </section>
      {preferences && <PreferencesForm />}
    </>
  );
}
