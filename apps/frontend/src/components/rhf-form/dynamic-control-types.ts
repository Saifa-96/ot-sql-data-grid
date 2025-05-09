export type ControlType = "text";

export interface Validator {
  min?: number;
  max?: number;
  required?: boolean;
  regex?: string;
}

interface FieldConfigItem<T, D> {
  type: T;
  defaultValue: D;
  placeholder?: string;
}

export type FieldConfig =
  | FieldConfigItem<"text", string>
  | FieldConfigItem<"number", number>;

export interface DynamicFieldData {
  label: string;
  fieldName: string;
  fieldConfig: FieldConfig;
  placeholder?: string;
  description?: string;
  validator?: Validator;
}
