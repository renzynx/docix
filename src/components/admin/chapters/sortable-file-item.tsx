/* eslint-disable @next/next/no-img-element */
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../../ui/button";
import { GripVertical, X, FileImage } from "lucide-react";

type SortableFileItemProps = {
  file: File;
  index: number;
  id: string;
  onRemove: () => void;
};

export function SortableFileItem({
  file,
  index,
  id,
  onRemove,
}: SortableFileItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group border rounded-lg overflow-hidden bg-card"
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing bg-black/70 hover:bg-black/90 rounded p-1.5 transition-colors"
      >
        <GripVertical className="h-4 w-4 text-white" />
      </div>

      {/* Image Preview */}
      <div className="aspect-[2/3] bg-muted flex items-center justify-center">
        {file.type.startsWith("image/") ? (
          <img
            src={URL.createObjectURL(file)}
            alt={`Page ${index + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <FileImage className="h-8 w-8 text-muted-foreground" />
        )}
      </div>

      {/* Remove Button (appears on hover) */}
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
        <Button
          type="button"
          size="icon"
          variant="destructive"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Page Number Badge */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center">
        Page {index + 1}
      </div>
    </div>
  );
}
