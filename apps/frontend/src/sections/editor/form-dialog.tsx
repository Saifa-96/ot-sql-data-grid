import { PropsWithChildren } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { RHFInput } from "@/components/rhf/rhf-input";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { getDefaults } from "@/utils/zod";

interface FormDialogProps {
  onSubmit: (data: FormValues) => void;
}

export function FormDialog(props: PropsWithChildren<FormDialogProps>) {
  const { children, onSubmit } = props;
  const methods = useForm<FormValues>({
    defaultValues: getDefaults(schema),
    resolver: zodResolver(schema),
  });

  return (
    <Form {...methods}>
      <form id="form" onSubmit={methods.handleSubmit(onSubmit)} className="space-y-4">
        <Dialog>
          <DialogTrigger asChild>{children}</DialogTrigger>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Are you absolutely sure?</DialogTitle>
              <DialogDescription>
                This action cannot be undone. This will permanently delete your
                account and remove your data from our servers.
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
  email: z.string().nonempty().default(""),
});
