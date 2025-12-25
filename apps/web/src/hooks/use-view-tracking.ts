"use client";

import { incrementChapterView, incrementSeriesView } from "@docix/api";
import { useEffect, useRef } from "react";

const VIEW_STORAGE_KEY = "docix:views";
const VIEW_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour - matches server-side dedup TTL

type ViewType = "series" | "chapter";

interface ViewRecord {
	timestamp: number;
}

type ViewStorage = Record<string, ViewRecord>;

function getStorageKey(type: ViewType, id: string): string {
	return `${type}:${id}`;
}

function getViewStorage(): ViewStorage {
	if (typeof window === "undefined") return {};
	try {
		const stored = localStorage.getItem(VIEW_STORAGE_KEY);
		return stored ? JSON.parse(stored) : {};
	} catch {
		return {};
	}
}

function setViewStorage(storage: ViewStorage): void {
	if (typeof window === "undefined") return;
	try {
		localStorage.setItem(VIEW_STORAGE_KEY, JSON.stringify(storage));
	} catch {
		// Storage full or unavailable - continue without persistence
	}
}

function isViewRecent(type: ViewType, id: string): boolean {
	const storage = getViewStorage();
	const key = getStorageKey(type, id);
	const record = storage[key];

	if (!record) return false;

	const now = Date.now();
	return now - record.timestamp < VIEW_COOLDOWN_MS;
}

function recordViewLocally(type: ViewType, id: string): void {
	const storage = getViewStorage();
	const key = getStorageKey(type, id);

	// Clean up old entries (older than 24 hours) to prevent storage bloat
	const now = Date.now();
	const cleanedStorage: ViewStorage = {};
	for (const [k, v] of Object.entries(storage)) {
		if (now - v.timestamp < 24 * 60 * 60 * 1000) {
			cleanedStorage[k] = v;
		}
	}

	cleanedStorage[key] = { timestamp: now };
	setViewStorage(cleanedStorage);
}

async function trackView(type: ViewType, id: string): Promise<void> {
	if (!id) return;

	if (isViewRecent(type, id)) {
		return;
	}

	try {
		if (type === "series") {
			await incrementSeriesView(id);
		} else {
			await incrementChapterView(id);
		}
		recordViewLocally(type, id);
	} catch {
		// Silent fail - view tracking is non-critical
	}
}

/**
 * Hook to track series views with client-side deduplication.
 * Skips tracking if the same series was viewed within the last hour.
 */
export function useSeriesView(seriesId: string | undefined): void {
	const trackedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!seriesId || trackedRef.current === seriesId) return;
		trackedRef.current = seriesId;
		trackView("series", seriesId);
	}, [seriesId]);
}

/**
 * Hook to track chapter views with client-side deduplication.
 * Skips tracking if the same chapter was viewed within the last hour.
 * Also records a series view (reading a chapter counts as viewing the series).
 */
export function useChapterView(chapterId: string | undefined): void {
	const trackedRef = useRef<string | null>(null);

	useEffect(() => {
		if (!chapterId || trackedRef.current === chapterId) return;
		trackedRef.current = chapterId;
		trackView("chapter", chapterId);
	}, [chapterId]);
}
