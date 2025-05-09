import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  title: string;
  className?: string;
}

const SectionCard: React.FC<React.PropsWithChildren<SectionCardProps>> = ({
  className,
  title,
  children,
}) => (
  <Card className={cn("box-border", className)}>
    <div className="flex flex-col flex-1 h-full">
      <h1 className="font-bold py-3 px-4 border-b">{title}</h1>
      <div className="flex-1 relative">
        <div className="flex-1 absolute top-0 left-0 bottom-0 right-0">
          <ScrollArea className="h-full">{children}</ScrollArea>
        </div>
      </div>
    </div>
  </Card>
);

export default SectionCard;
