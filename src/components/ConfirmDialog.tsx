import React from "react";

type Props = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export default function ConfirmDialog({
  open, title = "Confirmation",
  message = "Êtes-vous sûr ?",
  confirmLabel = "Oui, confirmer",
  cancelLabel = "Annuler",
  onConfirm, onClose
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="card max-w-md w-full p-5">
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <p className="subtle mb-4">{message}</p>
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={onClose}>{cancelLabel}</button>
            <button
              className="btn-danger"
              onClick={() => { onConfirm(); onClose(); }}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
