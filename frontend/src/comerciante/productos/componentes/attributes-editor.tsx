import { Button, Field } from '../../../compartido/componentes/ui';
import type { Attribute } from '../types';

export function AttributesEditor({
  value,
  onChange,
  variant = false,
  title,
  description,
}: {
  value: Attribute[];
  onChange: (value: Attribute[]) => void;
  variant?: boolean;
  title?: string;
  description?: string;
}) {
  function update(index: number, changes: Partial<Attribute>) {
    onChange(value.map((a, i) => (i === index ? { ...a, ...changes } : a)));
  }
  return (
    <section
      className="attributes-editor"
      aria-label={
        title ?? (variant ? 'Características de la variante' : 'Características del producto')
      }
    >
      <h3>{title ?? (variant ? 'Qué distingue esta variante' : 'Características')}</h3>
      <p className="field-hint">
        {description ??
          (variant
            ? 'Cada combinación tendrá su propio conteo. Completa al menos una característica.'
            : 'Añade solo lo que te ayude a encontrar y describir tu producto. Esto no separa cantidades.')}
      </p>
      <p className="field-hint">
        Puedes cambiar los nombres, quitar características o añadir otras. Deja el valor vacío si no
        quieres registrar esa característica; no se guardará.
      </p>
      {value.map((a, i) => (
        <div key={i} className="attribute-row">
          <Field
            id={`attribute-name-${i}`}
            label={`Característica ${i + 1}`}
            value={a.nombre}
            maxLength={40}
            placeholder="Ej.: Marca, talla, color"
            required={!!a.valor.trim()}
            onChange={(e) => update(i, { nombre: e.target.value })}
          />
          <Field
            id={`attribute-value-${i}`}
            label={`Valor ${i + 1}`}
            value={a.valor}
            maxLength={160}
            onChange={(e) => update(i, { valor: e.target.value })}
          />
          <Button
            type="button"
            variant="ghost"
            aria-label={`Quitar característica ${i + 1}`}
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Quitar
          </Button>
        </div>
      ))}
      <div className="row-actions">
        <Button
          type="button"
          variant="secondary"
          disabled={value.length >= 20}
          onClick={() => onChange([...value, { nombre: '', valor: '' }])}
        >
          Añadir característica
        </Button>
        {!value.length && (
          <Button
            type="button"
            variant="ghost"
            onClick={() =>
              onChange(
                (variant ? ['Talla', 'Copa', 'Color', 'Diseño'] : ['Marca', 'Modelo']).map(
                  (nombre) => ({ nombre, valor: '' }),
                ),
              )
            }
          >
            Usar plantilla de lencería
          </Button>
        )}
      </div>
    </section>
  );
}
