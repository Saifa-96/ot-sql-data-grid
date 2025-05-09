import { FormProvider, useForm } from "react-hook-form";
import { DynamicFieldData } from "./dynamic-control-types";
import DynamicControl from "./dynamic-control";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { useImperativeHandle, useMemo, useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as validatorUtils from "./validator";

interface RHFFormAPI {
  setValue: (name: string, value: unknown) => void;
}

interface FormProps {
  id?: string;
  apiRef?: React.RefObject<RHFFormAPI>;
  fields: DynamicFieldData[];
  onSubmit: (data: Record<string, unknown>) => void;
}

export const useRHFFormAPI = () => {
  const apiRef = useRef<RHFFormAPI>({
    setValue: (_name: string, _value: unknown) => {
      console.warn("RHFForm API not initialized");
    },
  });
  return apiRef;
};

export const RHFForm = ({ id, fields, onSubmit, apiRef }: FormProps) => {
  const validator = useMemo(() => {
    const validatorRecord = fields.reduce<Record<string, z.ZodTypeAny>>(
      (record, field) => {
        record[field.fieldName] = validatorUtils.getZodValidatorByType(
          field.fieldConfig,
          field.validator
        );
        return record;
      },
      {}
    );
    return z.object(validatorRecord);
  }, [fields]);

  const defaultValues = useMemo(() => {
    return fields.reduce<Record<string, unknown>>((record, field) => {
      record[field.fieldName] = field.fieldConfig.defaultValue ?? null;
      return record;
    }, {});
  }, [fields]);

  const formMethods = useForm({
    defaultValues,
    resolver: zodResolver(validator),
  });

  useImperativeHandle(apiRef, () => ({
    setValue: (name: string, value: unknown) => {
      formMethods.setValue(name, value);
    },
  }));

  return (
    <form
      id={id}
      className="space-y-4"
      onSubmit={formMethods.handleSubmit(onSubmit)}
    >
      <FormProvider {...formMethods}>
        {fields.map((d, i) => (
          <FormField
            key={i}
            control={formMethods.control}
            name={d.fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{d.label}</FormLabel>
                <FormControl>
                  <DynamicControl
                    config={d.fieldConfig}
                    value={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
                {d.description && (
                  <FormDescription>
                    This is your public display name.
                  </FormDescription>
                )}
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </FormProvider>
    </form>
  );
};
