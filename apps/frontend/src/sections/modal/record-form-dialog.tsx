"use client";
import { RHFForm } from "@/components/rhf-form";
import { DynamicFieldData } from "@/components/rhf-form/dynamic-control-types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { openModel, useModelState } from "@/hooks/use-model-state";
import { useState } from "react";

interface RecordFormPayload {
  fields: DynamicFieldData[];
  onSubmit: (data: Record<string, unknown>) => void;
}

const uniqId = "record-form-dialog";
export const openRecordFormDialog = openModel<RecordFormPayload>(uniqId);
const RecordFormDialog: React.FC = () => {
  const [payload, setPayload] = useState<RecordFormPayload>({
    fields: [],
    onSubmit: () => {
      throw new Error("onSubmit is not defined");
    },
  });

  const props = useModelState<RecordFormPayload>({
    uniqId,
    onReceivePayload: setPayload,
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    payload.onSubmit(data);
    props.onOpenChange(false);
  };

  return (
    <Dialog {...props}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>New Record</DialogTitle>
          <DialogDescription>
            This is a description of the new record dialog.
          </DialogDescription>
        </DialogHeader>

        <RHFForm
          id="new-record"
          fields={payload.fields}
          onSubmit={handleSubmit}
        />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button form="new-record" type="submit">
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RecordFormDialog;
