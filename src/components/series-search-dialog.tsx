/* eslint-disable @next/next/no-img-element */
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/use-debounce";
import { api } from "@convex/_generated/api";
import { useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type SeriesSearchDialogProps = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

export const SeriesSearchDialog = ({
  open,
  setOpen,
}: SeriesSearchDialogProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const data = useQuery(
    api.series.searchSeries,
    debouncedSearchQuery
      ? {
          searchText: debouncedSearchQuery,
        }
      : "skip"
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      title="Search Series"
      description="Search for manga or comics series"
    >
      <CommandInput
        placeholder="Type to search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        {!data || data.length === 0 ? (
          <CommandEmpty>No results found.</CommandEmpty>
        ) : (
          <CommandGroup heading={`${data.length} results`}>
            {data.map((series) => (
              <CommandItem
                key={series._id}
                value={series.title}
                onSelect={() => {
                  router.push(`/series/${series.slug}`);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-3 w-full">
                  {series.coverImageUrl && (
                    <img
                      src={series.coverImageUrl}
                      alt={series.title}
                      width={40}
                      height={56}
                      className="w-10 h-14 object-cover rounded"
                    />
                  )}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <span className="truncate font-medium">{series.title}</span>
                    {series.description && (
                      <span className="text-xs text-muted-foreground truncate">
                        {series.description}
                      </span>
                    )}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
};
