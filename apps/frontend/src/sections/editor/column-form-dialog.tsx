import { FC, useEffect } from "react";
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
}

export const ColumnFormDialog: FC<ColumnFormDialogProps> = (props) => {
  const { open, setOpen, onSubmit } = props;
  const methods = useForm<ColumnFormData>({
    defaultValues: getDefaults(schema),
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    if (open) {
      methods.reset();
    }
  }, [methods, open]);

  return (
    <Form {...methods}>
      <form
        id="column-form"
        onSubmit={methods.handleSubmit(onSubmit)}
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
  name: z.string().nonempty().default(""),
  displayName: z.string().nonempty().default(""),
});
