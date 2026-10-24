import { MoneyField } from '../../../compartido/dinero/money-field';
import { useClientPage, ClientPager } from '../../../compartido/componentes/pagination';
import { DifferencesEditor } from './differences-editor';
import { Button, Field } from '../../../compartido/componentes/ui';
import { CheckField } from '../../../compartido/componentes/form-controls';
import { CodeField } from '../../../compartido/escaneo/code-field';
import { combinationDraft, type CombinationDraft } from '../registration';

export function CombinationsEditor({
  axes,
  rows,
  onAxes,
  onRows,
}: {
  axes: string[];
  rows: CombinationDraft[];
  onAxes: (axes: string[]) => void;
  onRows: (rows: CombinationDraft[]) => void;
}) {
  const page = useClientPage(rows);
  function renameAxis(index: number, name: string) {
    const previous = axes[index];
    onAxes(axes.map((a, i) => (i === index ? name : a)));
    onRows(
      rows.map((row) => ({
        ...row,
        caracteristicas: row.caracteristicas.map((a) =>
          a.nombre.toLocaleLowerCase() === previous.toLocaleLowerCase()
            ? { ...a, nombre: name }
            : a,
        ),
      })),
    );
  }
  function update(key: string, changes: Partial<CombinationDraft>) {
    onRows(rows.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  }
  return (
    <section className="registration-section">
      <h3>2. ¿Qué cambia entre las combinaciones?</h3>
      <p className="field-hint">
        La categoría propone estos detalles. Puedes cambiar sus nombres, quitarlos o añadir otros.
        Cambiar la categoría conserva las combinaciones que ya completaste.
      </p>
      <DifferencesEditor
        value={axes}
        onChange={onAxes}
        onRename={renameAxis}
        onRemove={(i) => {
          onAxes(axes.filter((_, n) => n !== i));
          onRows(
            rows.map((row) => ({
              ...row,
              caracteristicas: row.caracteristicas.filter(
                (a) => a.nombre.toLocaleLowerCase() !== axes[i].toLocaleLowerCase(),
              ),
            })),
          );
        }}
      />
      <h3>3. Combinaciones del producto</h3>
      <p className="field-hint">
        Cada fila representa una combinación de estos detalles. Puede tener muchas unidades; las
        contarás después en Inventario.
      </p>
      <ClientPager page={page} />
      {page.items.map((row, localIndex) => (
        <fieldset
          className="combination-card"
          key={row.key}
          aria-label={`Combinación ${page.offset + localIndex + 1}`}
        >
          <legend>
            Combinación {page.offset + localIndex + 1}
            {row.original ? ' · Guardada' : ' · Nueva'}
          </legend>
          <details open={!row.original}>
            <summary>
              <strong>
                {row.caracteristicas
                  .filter((a) => a.valor.trim())
                  .map((a) => `${a.nombre}: ${a.valor}`)
                  .join(' · ') || 'Completar los detalles'}
              </strong>
              <span>{row.codigo || 'Sin código'} · Editar detalles</span>
            </summary>
            <div className="form-grid">
              {axes.map((axis, index) => (
                <Field
                  key={index}
                  id={`${row.key}-axis-${index}`}
                  label={axis || `Diferencia ${index + 1}`}
                  maxLength={160}
                  value={
                    row.caracteristicas.find(
                      (a) => a.nombre.toLocaleLowerCase() === axis.toLocaleLowerCase(),
                    )?.valor ?? ''
                  }
                  onChange={(e) =>
                    update(row.key, {
                      caracteristicas: [
                        ...row.caracteristicas.filter(
                          (a) => a.nombre.toLocaleLowerCase() !== axis.toLocaleLowerCase(),
                        ),
                        { nombre: axis, valor: e.target.value },
                      ],
                    })
                  }
                />
              ))}
            </div>
            <Field
              id={`${row.key}-name`}
              label="Nombre de la combinación (opcional)"
              placeholder="Se forma con los valores que completes"
              maxLength={160}
              value={row.nombre}
              onChange={(e) => update(row.key, { nombre: e.target.value })}
            />
            <CodeField
              id={`${row.key}-code`}
              label="Código de esta combinación (opcional)"
              hint={null}
              value={row.codigo}
              onChange={(codigo) => update(row.key, { codigo })}
            />
            <div className="form-grid">
              {(['precio', 'costo'] as const).map((key) => (
                <MoneyField
                  key={key}
                  id={`${row.key}-${key}`}
                  label={
                    key === 'precio'
                      ? 'Precio de esta combinación (S/, opcional)'
                      : 'Costo de esta combinación (S/, opcional)'
                  }

                  pattern="[0-9]{1,12}([.,][0-9]{1,2})?"
                  value={row[key]}
                  placeholder="Pendiente"
                  onChange={(e) => update(row.key, { [key]: e.target.value })}
                />
              ))}
            </div>
            {row.original ? (
              <CheckField
                label="Combinación activa"
                checked={row.activo}
                onChange={(activo) => update(row.key, { activo })}
                hint="Pausarla conserva sus conteos. Una combinación ya contada no puede cambiar de talla o color desde este formulario."
              />
            ) : (
              <Button
                type="button"
                variant="ghost"
                onClick={() => onRows(rows.filter((r) => r.key !== row.key))}
              >
                Quitar combinación {page.offset + localIndex + 1}
              </Button>
            )}
          </details>
        </fieldset>
      ))}
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          onRows([...rows, combinationDraft()]);
          page.setOffset(Math.floor(rows.length / page.pageSize) * page.pageSize);
        }}
      >
        Añadir combinación
      </Button>
      {!rows.length && (
        <p className="field-hint">
          Puedes guardar el modelo ahora y añadir sus combinaciones después. El modelo no tiene un
          conteo adicional.
        </p>
      )}
    </section>
  );
}
