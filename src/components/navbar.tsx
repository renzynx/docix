"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { api } from "@convex/_generated/api";
import { Menu, Search, BookOpen, Hash, Shield } from "lucide-react";
import { useState } from "react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "./mode-toggle";
import { NotificationMenu } from "./notification-menu";
import { SeriesSearchDialog } from "./series-search-dialog";
import { Skeleton } from "./ui/skeleton";

type NavbarProps = {
  genres: (typeof api.genres.getAllGenres)["_returnType"];
};

export const Navbar = ({ genres }: NavbarProps) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center gap-4 px-4 mx-auto">
          {/* Mobile Drawer Trigger */}
          <div className="lg:hidden">
            <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
              <DrawerTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2">
                  <Menu className="size-5" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DrawerTrigger>
              <DrawerContent className="max-h-[85vh]">
                <DrawerHeader className="text-left border-b pb-4">
                  <DrawerTitle className="font-bold flex items-center gap-2">
                    <BookOpen className="size-5 text-primary" />
                    Docix
                  </DrawerTitle>
                </DrawerHeader>

                <ScrollArea className="p-4 h-full overflow-y-auto">
                  <div className="flex flex-col gap-6">
                    {/* Mobile Search */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Search
                      </h4>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-muted-foreground"
                        onClick={() => {
                          setDrawerOpen(false);
                          setSearchOpen(true);
                        }}
                      >
                        <Search className="mr-2 size-4" />
                        Search series...
                      </Button>
                    </div>

                    {/* Mobile Browse */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Browse
                      </h4>
                      <DrawerClose asChild>
                        <Button
                          asChild
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Link href="/series">
                            <BookOpen className="mr-2 size-4" />
                            All Series
                          </Link>
                        </Button>
                      </DrawerClose>
                    </div>

                    {/* Mobile Genres */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Genres
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        {genres.map((genre) => (
                          <DrawerClose key={genre._id} asChild>
                            <Button
                              asChild
                              variant="ghost"
                              className="justify-start h-auto py-2"
                              size="sm"
                            >
                              <Link href={`/genre/${genre.slug}`}>
                                <Hash className="mr-2 size-3 text-muted-foreground" />
                                <span className="truncate">{genre.name}</span>
                              </Link>
                            </Button>
                          </DrawerClose>
                        ))}
                      </div>
                    </div>

                    <div className="h-px bg-border my-2" />

                    {/* Mobile Account */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Theme</span>
                        <ModeToggle />
                      </div>

                      <Authenticated>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            Notifications
                          </span>
                          <NotificationMenu />
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="text-sm font-medium">Account</span>
                          <UserButton>
                            <UserButton.MenuItems>
                              <UserButton.Link
                                label="Management"
                                labelIcon={<Shield size={16} />}
                                href="/admin"
                              />
                            </UserButton.MenuItems>
                          </UserButton>
                        </div>
                      </Authenticated>

                      <Unauthenticated>
                        <div className="grid grid-cols-2 gap-2">
                          <DrawerClose asChild>
                            <Button asChild variant="outline">
                              <Link href="/sign-in">Sign In</Link>
                            </Button>
                          </DrawerClose>
                          <DrawerClose asChild>
                            <Button asChild>
                              <Link href="/sign-up">Sign Up</Link>
                            </Button>
                          </DrawerClose>
                        </div>
                      </Unauthenticated>
                    </div>
                  </div>
                </ScrollArea>
              </DrawerContent>
            </Drawer>
          </div>

          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 font-bold text-lg mr-4"
          >
            <BookOpen className="size-5 text-primary hidden md:block" />
            <span>Docix</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex flex-1 items-center gap-4">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuLink
                    href="/series"
                    className={navigationMenuTriggerStyle()}
                  >
                    All Series
                  </NavigationMenuLink>
                </NavigationMenuItem>
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
                              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground mt-1">
                                {genre.description}
                              </p>
                            )}
                          </Link>
                        </NavigationMenuLink>
                      ))}
                    </div>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>

            {/* Desktop Search */}
            <div className="flex-1 max-w-sm ml-auto">
              <Button
                variant="outline"
                className="w-full justify-start text-muted-foreground bg-muted/50"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="mr-2 size-4" />
                <span>Search series...</span>
                <kbd className="pointer-events-none ml-auto inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <span className="text-xs">⌘</span>K
                </kbd>
              </Button>
            </div>
          </div>

          {/* Desktop Right Actions */}
          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            {/* Mobile Search Icon Trigger */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="size-5" />
            </Button>

            <div className="hidden lg:flex items-center gap-2">
              <ModeToggle />

              <Authenticated>
                <NotificationMenu />
                <UserButton>
                  <UserButton.MenuItems>
                    <UserButton.Link
                      label="Management"
                      labelIcon={<Shield size={16} />}
                      href="/admin"
                    />
                  </UserButton.MenuItems>
                </UserButton>
              </Authenticated>

              <Unauthenticated>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/sign-in">Sign In</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/sign-up">Sign Up</Link>
                </Button>
              </Unauthenticated>

              <AuthLoading>
                <Skeleton className="h-8 w-8 rounded-full" />
              </AuthLoading>
            </div>
          </div>
        </div>
      </header>

      <SeriesSearchDialog open={searchOpen} setOpen={setSearchOpen} />
    </>
  );
};
