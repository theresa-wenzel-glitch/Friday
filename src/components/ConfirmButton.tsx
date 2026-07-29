"use client";

import { useFormStatus } from "react-dom";

/** Submit-Button mit Rueckfrage – schuetzt vor versehentlichem Loeschen. */
export function ConfirmButton({
  children,
  message,
  className = "btn btn-danger btn-sm",
}: {
  children: React.ReactNode;
  message: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      className={className}
      type="submit"
      disabled={pending}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
