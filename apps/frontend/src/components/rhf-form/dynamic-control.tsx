import { Input } from "../ui/input";
import { FieldConfig } from "./dynamic-control-types";

interface DynamicControlProps {
  value: unknown;
  config: FieldConfig;
  onChange: (value: unknown) => void;
}

const DynamicControl: React.FC<DynamicControlProps> = ({
  config: { type, placeholder },
  value,
  onChange,
}) => {
  switch (type) {
    case "text":
      return (
        <Input
          value={value as string}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
          }}
        />
      );
    case "number":
      return (
        <Input
          value={value as number}
          type="number"
          placeholder={placeholder}
          onChange={(e) => {
            onChange(Number(e.target.value));
          }}
        />
      );
    default:
      throw new Error(`Unsupported input type: ${type}`);
  }
};

export default DynamicControl;
