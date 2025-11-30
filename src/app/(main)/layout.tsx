import { Navbar } from "@/components/navbar";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const genres = await fetchQuery(api.genres.getAllGenres);

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar genres={genres} />
      <main className="flex-1 container mx-auto p-4 md:p-6">{children}</main>
    </div>
  );
}
