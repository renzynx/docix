import { api } from "@docix/api";
import type { ChapterReader, SeriesWithChapters } from "@docix/types";
import { cache } from "react";
import { getRequestHeaders } from "./tanstack-query/server";

export const getSeriesBySlug = cache(async (slug: string) => {
	const headers = await getRequestHeaders();
	const { data } = await api.get<SeriesWithChapters>(`/manga/${slug}`, {
		headers,
	});
	return data;
});

export const getChapter = cache(async (slug: string, chapterNumber: string) => {
	const headers = await getRequestHeaders();
	const { data } = await api.get<ChapterReader>(
		`/manga/${slug}/chapters/${chapterNumber}`,
		{ headers },
	);
	return data;
});
