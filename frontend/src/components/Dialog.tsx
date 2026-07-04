import React, { useRef, useEffect } from 'react';

interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className = '',
  ...props
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Synchronize internal HTML5 dialog state with isOpen prop
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else {
      if (dialog.open) {
        dialog.close();
      }
    }
  }, [isOpen]);

  // Synchronize parent state when the dialog closes natively (e.g. via Esc key)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      onClose();
    };

    dialog.addEventListener('close', handleClose);
    return () => {
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  // Fallback for browsers that do not support closedby="any" light-dismiss natively
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;

        const rect = dialog.getBoundingClientRect();
        const isDialogContent = (
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width
        );

        if (!isDialogContent) {
          dialog.close();
        }
      };

      dialog.addEventListener('click', handleBackdropClick);
      return () => {
        dialog.removeEventListener('click', handleBackdropClick);
      };
    }
  }, []);

  return (
    <dialog
      ref={dialogRef}
      // @ts-ignore - closedby is standard but might not be in older React types yet
      closedby="any"
      aria-labelledby="dialog-title"
      className={`glass-panel text-white p-6 rounded-2xl border border-zinc-800 shadow-2xl backdrop:backdrop-blur-sm max-w-md w-full outline-none ${className}`}
      {...props}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          {title && (
            <h3 id="dialog-title" className="text-xl font-display font-semibold text-white">
              {title}
            </h3>
          )}
          <button
            onClick={() => dialogRef.current?.close()}
            className="text-zinc-400 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
            aria-label="Close dialog"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        <div className="text-zinc-300">{children}</div>
      </div>
    </dialog>
  );
};
