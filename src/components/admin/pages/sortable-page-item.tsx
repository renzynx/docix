import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DataModel } from "@convex/_generated/dataModel";
import { Button } from "../../ui/button";
import { GripVertical, Trash2 } from "lucide-react";

type SortablePageItemProps = {
  page: DataModel["pages"]["document"] & { url?: string | null };
  onDelete: () => void;
};

export function SortablePageItem({ page, onDelete }: SortablePageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page._id });

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
      <div className="aspect-[2/3] bg-muted relative">
        {page.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.url}
            alt={`Page ${page.pageNumber}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab active:cursor-grabbing bg-black/70 hover:bg-black/90 rounded p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-4 w-4 text-white" />
        </div>
      </div>

      {/* Delete Button */}
      <Button
        variant="destructive"
        size="sm"
        onClick={onDelete}
        className="w-full rounded-t-none"
      >
        <Trash2 className="h-4 w-4 mr-2" />
        Delete
      </Button>

      {/* Page Number Badge */}
      <div className="absolute bottom-10 left-0 right-0 bg-black/70 text-white text-xs py-1 px-2 text-center">
        Page {page.pageNumber}
      </div>
    </div>
  );
}
