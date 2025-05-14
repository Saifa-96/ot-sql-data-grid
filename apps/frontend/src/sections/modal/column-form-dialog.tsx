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
import { openModal, useModalState } from "@/hooks/use-modal-state";
import { cloneDeep } from "lodash";
import { useRef, useState } from "react";

interface ColumnFormDialogPayload {
  orderBy?: number;
  onSubmit: (data: Record<string, unknown>) => void;
}

const uniqId = "column-form-dialog";
export const openColumnFormDialog = openModal<ColumnFormDialogPayload>(uniqId);
const ColumnFormDialog: React.FC = () => {
  const submitRef = useRef<ColumnFormDialogPayload["onSubmit"] | null>(null);
  const [fields, setFields] = useState<DynamicFieldData[]>(defaultFields);

  const props = useModalState<ColumnFormDialogPayload>({
    uniqId,
    onReceivePayload: (payload) => {
      const { onSubmit, orderBy } = payload;
      submitRef.current = onSubmit;
      if (orderBy) {
        const copiedFields = cloneDeep(defaultFields);
        const orderByField = copiedFields.find(
          (field) => field.fieldName === "orderBy"
        );
        if (orderByField) {
          orderByField.fieldConfig.defaultValue = orderBy;
        }
        setFields(copiedFields);
      }
    },
    onOpenChange(open) {
      if (!open) {
        setFields(defaultFields);
        submitRef.current = null;
      }
    },
  });

  const handleSubmit = (data: Record<string, unknown>) => {
    submitRef.current?.(data);
    props.onOpenChange(false);
  };

  return (
    <Dialog {...props}>
      <DialogContent className="bg-white">
        <DialogHeader>
          <DialogTitle>New Column</DialogTitle>
          <DialogDescription>
            This is a description of the new column dialog.
          </DialogDescription>
        </DialogHeader>

        <RHFForm id="new-column" fields={fields} onSubmit={handleSubmit} />

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button form="new-column" type="submit">
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ColumnFormDialog;

const defaultFields: DynamicFieldData[] = [
  {
    label: "Field Name",
    fieldName: "fieldName",
    fieldConfig: {
      type: "text",
      defaultValue: "",
    },
    placeholder: "Enter field name",
    validator: {
      required: true,
      regex: "^[a-zA-Z_][a-zA-Z0-9_]*$",
    },
  },
  {
    label: "Display Name",
    fieldName: "displayName",
    fieldConfig: {
      type: "text",
      defaultValue: "",
    },
    placeholder: "Enter display name",
    validator: {
      required: true,
    },
  },
  {
    label: "Width",
    fieldName: "width",
    fieldConfig: {
      type: "number",
      defaultValue: 150,
    },
    placeholder: "Enter width",
    validator: {
      min: 0,
    },
  },
  {
    label: "Order By",
    fieldName: "orderBy",
    fieldConfig: {
      type: "number",
      defaultValue: 10100,
    },
    placeholder: "Enter order by",
    validator: {
      // TODO: required not work.
      // required: true,
      min: 0,
    },
  },
];
