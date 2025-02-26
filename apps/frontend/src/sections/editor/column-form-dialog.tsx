import { FC, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RHFInput } from "@/components/rhf/rhf-input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getDefaults } from "@/utils/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/ui/form";

interface ColumnFormDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  onSubmit: (data: ColumnFormData) => void;
  existingNames: string[];
}

export const ColumnFormDialog: FC<ColumnFormDialogProps> = (props) => {
  const { open, setOpen, onSubmit, existingNames } = props;
  const methods = useForm<ValidatedFormValues>({
    defaultValues: { ...getDefaults(schema), existingNames },
    resolver: zodResolver(validatedSchema),
  });

  const handleSubmit = useCallback(
    (formData: ValidatedFormValues) => {
      onSubmit(schema.parse(formData));
    },
    [onSubmit]
  );

  useEffect(() => {
    if (open) {
      methods.reset();
    }
  }, [methods, open]);

  return (
    <Form {...methods}>
      <form
        id="column-form"
        onSubmit={methods.handleSubmit(handleSubmit)}
        className="space-y-4"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Insert Column</DialogTitle>
              <DialogDescription>
                This form allows you to insert a new column. Please provide the
                necessary information.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <RHFInput label="Name" name="name" />
              <RHFInput label="DisplayName" name="displayName" />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>

              <Button form="column-form" type="submit">
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
};

export type ColumnFormData = z.infer<typeof schema>;

const schema = z.object({
  name: z
    .string()
    .nonempty()
    .regex(/^[a-zA-Z_]+$/)
    .refine((v) => v !== "name", { message: "`name` is a key word." })
    .default(""),
  displayName: z.string().nonempty().default(""),
});

type ValidatedFormValues = z.infer<typeof validatedSchema>;

const validatedSchema = schema
  .extend({
    existingNames: z.array(z.string()).default([]),
  })
  .superRefine((data, ctx) => {
    if (data.existingNames.includes(data.name)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Name must be unique",
        path: ["name"],
      });
    }
  });
