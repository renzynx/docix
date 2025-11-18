import { Id } from "@convex/_generated/dataModel";
import { clsx, type ClassValue } from "clsx";
import { toast } from "sonner";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

export function dataUrlToWebPBlob(
  dataUrl: string,
  quality = 0.9
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        return reject(new Error("Failed to get canvas 2D context."));
      }

      ctx.drawImage(image, 0, 0);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            return reject(new Error("Canvas toBlob failed to create a blob."));
          }
          resolve(blob);
        },
        "image/webp",
        quality
      );
    };

    image.onerror = (err) => {
      reject(new Error(`Failed to load image from data URL: ${err}`));
    };

    image.src = dataUrl;
  });
}

export async function uploadCover(data: string, url: string) {
  try {
    const webpBlob = await dataUrlToWebPBlob(data, 0.9);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "image/webp",
      },
      body: webpBlob,
    });

    if (!res.ok) {
      throw new Error(
        `Failed to upload cover image: ${res.status} ${res.statusText}`
      );
    }

    const responseData = await res.json();

    if (!responseData || !responseData.storageId) {
      throw new Error("Invalid response from upload server.");
    }

    return responseData.storageId as Id<"_storage">;
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "An unknown upload error occurred.";

    console.error("Upload failed:", error);
    toast.error(errorMessage);
    return null;
  }
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (years > 0) return rtf.format(-years, "year");
  if (months > 0) return rtf.format(-months, "month");
  if (weeks > 0) return rtf.format(-weeks, "week");
  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}

export function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
