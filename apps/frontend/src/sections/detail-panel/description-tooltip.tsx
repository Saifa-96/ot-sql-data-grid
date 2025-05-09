import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { cva, VariantProps } from "class-variance-authority";

const dotVariant = cva("flex h-2 w-2 rounded-full mr-2", {
  variants: {
    variant: {
      green: "bg-green-500",
      blue: "bg-blue-500",
      orange: "bg-orange-500",
    },
  },
});

interface DescriptionTooltipProps extends VariantProps<typeof dotVariant> {
  title: string;
  content: string;
}

const DescriptionTooltip: React.FC<DescriptionTooltipProps> = (props) => {
  const { title, content, variant } = props;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <p className="flex items-center">
            <span className={cn(dotVariant({ variant }))} />
            <span className="text-xs text-gray-600">{title}</span>
          </p>
        </TooltipTrigger>
        <TooltipContent>
          <p className="w-96">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DescriptionTooltip;
