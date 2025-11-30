"use client";

import { Authenticated, AuthLoading } from "convex/react";
import { ReactNode } from "react";

type ConvexAuthLoadingProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

export const ConvexAuthLoading = ({
  children,
  fallback,
}: ConvexAuthLoadingProps) => {
  return (
    <>
      <AuthLoading>{fallback}</AuthLoading>
      <Authenticated>{children}</Authenticated>
    </>
  );
};
