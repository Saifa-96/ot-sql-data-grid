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
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { RHFInput } from "@/components/rhf/rhf-input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getDefaults } from "@/utils/zod";
import { useEffect } from "react";

interface FormDialogProps {
  open: boolean;
  setOpen: (state: boolean) => void;
  onSubmit: (data: FormValues) => void;
}

export function FormDialog(props: FormDialogProps) {
  const { open, setOpen, onSubmit } = props;
  const methods = useForm<FormValues>({
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
        id="form"
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-4"
      >
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Add an new record</DialogTitle>
              <DialogDescription>
                Add a new record to the data grid.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <RHFInput label="Name" name="name" />
              <RHFInput label="Gender" name="gender" />
              <RHFInput label="Phone" name="phone" />
              <RHFInput label="Email" name="email" />
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>

              <Button form="form" type="submit">
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </form>
    </Form>
  );
}

export type FormValues = z.infer<typeof schema>;

const schema = z.object({
  name: z.string().nonempty().default(""),
  gender: z.string().nonempty().default("male"),
  phone: z.string().nonempty().default(""),
  email: z.string().email().nonempty().default(""),
});
