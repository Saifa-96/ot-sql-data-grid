import { useMemo, useState } from "react";

export const useDialogOpenState = () => {
  const [open, setOpen] = useState(false);
  const methods = useMemo(
    () => ({
      open: () => setOpen(true),
      close: () => setOpen(false),
      setOpen,
    }),
    []
  );
  return { open, methods };
};
