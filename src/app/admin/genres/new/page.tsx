import { GenreForm } from "@/components/admin/genres/genre-form";

export default function NewGenrePage() {
  return (
    <div className="flex items-center justify-center">
      <GenreForm mode="create" />
    </div>
  );
}
