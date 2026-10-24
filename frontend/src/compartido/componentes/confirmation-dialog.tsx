import { Modal } from './modal';
import { Button } from './ui';

export function ConfirmationDialog({
  title,
  description,
  confirmLabel = 'Confirmar',
  busy,
  onConfirm,
  onCancel,
  size = 'standard',
}: {
  title: string;
  description: string;
  confirmLabel?: string;
  busy: boolean;
  onConfirm: () => unknown;
  onCancel: () => void;
  size?: 'standard' | 'compact';
}) {
  return (
    <Modal label={title} onClose={onCancel} busy={busy} size={size}>
      <h2>{title}</h2>
      <p className="field-hint">{description}</p>
      <div className="form-actions">
        <Button type="button" variant="secondary" disabled={busy} onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="button" busy={busy} onClick={() => void onConfirm()}>
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
