"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import { api } from "@convex/_generated/api";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { Search, ShieldUser } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { ModeToggle } from "./mode-toggle";
import { NotificationMenu } from "./notification-menu";
import { SeriesSearchDialog } from "./series-search-dialog";
import { Button } from "./ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "./ui/input-group";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import { Skeleton } from "./ui/skeleton";

type NavbarProps = {
  genres: (typeof api.genres.getAllGenres)["_returnType"];
};

export const Navbar = ({ genres }: NavbarProps) => {
  const { user } = useUser();
  const [open, setOpen] = useState(false);

  return (
    <nav className="w-full px-4 py-3 flex items-center justify-between border-b border-border/50 bg-background/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-bold text-xl">
          Docix
        </Link>

        <NavigationMenu>
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuTrigger>Genres</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                  {genres.map((genre) => (
                    <NavigationMenuLink key={genre._id} asChild>
                      <Link
                        href={`/genre/${genre.slug}`}
                        className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                      >
                        <div className="text-sm font-medium leading-none">
                          {genre.name}
                        </div>
                        {genre.description && (
                          <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                            {genre.description}
                          </p>
                        )}
                      </Link>
                    </NavigationMenuLink>
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
                className="group inline-flex h-9 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
              >
                <Link href="/series">Browse</Link>
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>

      <div className="max-w-md w-full lg:block hidden">
        <InputGroup>
          <InputGroupInput
            placeholder="Search..."
            readOnly
            onFocus={() => setOpen(true)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
        </InputGroup>
        <SeriesSearchDialog open={open} setOpen={setOpen} />
      </div>

      <div className="flex gap-4 items-center">
        <Button
          className="lg:hidden"
          variant="ghost"
          size="icon"
          onClick={() => setOpen(true)}
        >
          <Search />
        </Button>

        <Authenticated>
          <NotificationMenu />
        </Authenticated>

        <ModeToggle />

        <Unauthenticated>
          <Button asChild variant="outline">
            <Link href="/sign-in">Sign In</Link>
          </Button>

          <Button asChild>
            <Link href="/sign-up">Sign Up</Link>
          </Button>
        </Unauthenticated>

        <AuthLoading>
          <Skeleton className="w-8 h-8 rounded-full" />
        </AuthLoading>

        <Authenticated>
          <UserButton>
            {user?.publicMetadata.role === "admin" && (
              <UserButton.MenuItems>
                <UserButton.Link
                  label="Management"
                  labelIcon={<ShieldUser size={16} />}
                  href="/admin"
                />
              </UserButton.MenuItems>
            )}
          </UserButton>
        </Authenticated>
      </div>
    </nav>
  );
};
