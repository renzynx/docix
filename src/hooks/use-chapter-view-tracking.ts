import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

const STORAGE_KEY = "chapter_views";
const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown

interface ChapterView {
  chapterId: string;
  timestamp: number;
}

interface StoredViews {
  [key: string]: number; // chapterId -> timestamp
}

/**
 * Advanced chapter view tracking hook with spam prevention
 * - Only counts a view once per hour per chapter
 * - Uses localStorage to persist view history
 * - Prevents refresh spam
 */
export function useChapterViewTracking(chapterId: Id<"chapters">) {
  const incrementChapterView = useMutation(api.chapters.incrementChapterView);
  const hasTracked = useRef(false);

  useEffect(() => {
    // Prevent double-tracking in strict mode
    if (hasTracked.current) return;

    const shouldTrackView = (): boolean => {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        const views: StoredViews = stored ? JSON.parse(stored) : {};

        const lastViewed = views[chapterId];
        const now = Date.now();

        // If never viewed or cooldown has passed
        if (!lastViewed || now - lastViewed > VIEW_COOLDOWN_MS) {
          // Update the view timestamp
          views[chapterId] = now;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(views));

          // Clean up old entries (older than 7 days)
          const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
          Object.keys(views).forEach((key) => {
            if (views[key] < sevenDaysAgo) {
              delete views[key];
            }
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(views));

          return true;
        }

        return false;
      } catch (error) {
        // If localStorage fails, still track the view
        console.warn("Failed to check view history:", error);
        return true;
      }
    };

    if (shouldTrackView()) {
      hasTracked.current = true;
      incrementChapterView({ chapterId }).catch((error) => {
        console.error("Failed to increment chapter view:", error);
        // Reset on error so it can retry
        hasTracked.current = false;
      });
    }
  }, [chapterId, incrementChapterView]);
}
