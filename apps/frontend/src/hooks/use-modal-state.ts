import { useCallback, useEffect, useState } from "react";
import mitt from "mitt";

// Declare the any type, the type of each payload is different.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const emitter = mitt<Record<string, any>>();

interface UseModelStateParams<T = unknown> {
  uniqId: string;
  onOpenChange?: (open: boolean) => void;
  onReceivePayload?: (payload: T) => void;
}

export const openModal =
  <T>(uniqId: string) =>
  (payload: T) =>
    emitter.emit(uniqId, payload);

export const useModalState = <T = unknown>({
  uniqId,
  onOpenChange,
  onReceivePayload,
}: UseModelStateParams<T>) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = useCallback(
    (o: boolean) => {
      setOpen(o);
      onOpenChange?.(o);
    },
    [onOpenChange]
  );

  useEffect(() => {
    const openModal = (payload: T) => {
      handleOpenChange(true);
      onReceivePayload?.(payload);
    };

    emitter.on(uniqId, openModal);
    return () => {
      emitter.off(uniqId, openModal);
    };
  }, [handleOpenChange, onReceivePayload, uniqId]);

  return {
    open,
    onOpenChange: handleOpenChange,
  };
};
