import { Reader } from "@/components/series/reader";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";

type ReaderPageProps = {
  params: Promise<{ slug: string; chapterNumber: string }>;
};

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug, chapterNumber } = await params;
  const chapterNum = parseInt(chapterNumber);

  // Get series and chapter data
  const series = await fetchQuery(api.series.getBySlug, { slug });

  if (!series) {
    notFound();
  }

  // Get chapter data with pages
  const readerData = await fetchQuery(api.chapters.getReaderData, {
    slug,
    chapterNumber: chapterNum,
  });

  if (!readerData) {
    notFound();
  }

  // Get all chapters to check for navigation
  const allChapters = await fetchQuery(api.chapters.getAllChapters, {
    seriesId: series._id,
  });

  // Find current chapter details
  const currentChapter = allChapters.find(
    (ch) => ch.chapterNumber === chapterNum
  );

  const currentChapterIndex = allChapters.findIndex(
    (ch) => ch.chapterNumber === chapterNum
  );

  const hasNextChapter = currentChapterIndex > 0; // chapters are in desc order
  const hasPrevChapter = currentChapterIndex < allChapters.length - 1;

  // Convert pageUrls to page objects
  const pages = readerData.pageUrls.map((url, index) => ({
    _id: `page-${index}`,
    pageNumber: index + 1,
    imageUrl: url,
  }));

  return (
    <Reader
      seriesSlug={slug}
      seriesTitle={series.title}
      chapterNumber={chapterNum}
      chapterTitle={currentChapter?.title}
      pages={pages}
      hasNextChapter={hasNextChapter}
      hasPrevChapter={hasPrevChapter}
    />
  );
}
