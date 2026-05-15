import type { ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableItemProps {
  id: number | string;
  disabled?: boolean;
  children: ReactNode;
  handleClassName?: string;
  className?: string;
}

export function SortableItem({
  id,
  disabled,
  children,
  handleClassName,
  className,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  } as const;

  return (
    <div ref={setNodeRef} style={style} className={cn("flex items-stretch gap-2", className)}>
      {!disabled && (
        <button
          type="button"
          aria-label="Arrastrar para reordenar"
          className={cn(
            "flex items-center justify-center px-1 text-muted-foreground hover:text-foreground touch-none cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
            handleClassName,
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
