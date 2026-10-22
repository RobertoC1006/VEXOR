import { Button, Loading, Notice } from './ui';
import type { ReactNode } from 'react';

export function ResourceState({ error, retry }: { error: Error | null; retry: () => unknown }) {
  return error ? (
    <section className="panel settings-error">
      <h1>No pudimos cargar esta sección</h1>
      <Notice>{error.message}</Notice>
      <Button onClick={() => void retry()}>Volver a intentar</Button>
    </section>
  ) : (
    <Loading />
  );
}
export function ActionFeedback({ error, message }: { error: string; message: string }) {
  return (
    <>
      {error && <Notice>{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
    </>
  );
}
export function PageHeading({
  title,
  description,
  action,
  eyebrow = 'CONFIGURA TU NEGOCIO',
  level = 1,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  eyebrow?: string;
  level?: 1 | 2;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        {level === 1 ? <h1>{title}</h1> : <h2>{title}</h2>}
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
