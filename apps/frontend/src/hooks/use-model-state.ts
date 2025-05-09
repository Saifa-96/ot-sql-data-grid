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

export const openModel =
  <T>(uniqId: string) =>
  (payload: T) =>
    emitter.emit(uniqId, payload);

export const useModelState = <T = unknown>({
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
    const openModel = (payload: T) => {
      handleOpenChange(true);
      onReceivePayload?.(payload);
    };

    emitter.on(uniqId, openModel);
    return () => {
      emitter.off(uniqId, openModel);
    };
  }, [handleOpenChange, onReceivePayload, uniqId]);

  return {
    open,
    onOpenChange: handleOpenChange,
  };
};
