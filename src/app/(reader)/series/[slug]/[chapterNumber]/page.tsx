import { Reader } from "@/components/series/reader";
import { api } from "@convex/_generated/api";
import { fetchQuery } from "convex/nextjs";
import { notFound } from "next/navigation";
import { cache } from "react";

type ReaderPageProps = {
  params: Promise<{ slug: string; chapterNumber: string }>;
};

const fetchReaderData = cache(async (slug: string, chapterNum: number) => {
  const series = await fetchQuery(api.series.getBySlug, { slug });

  if (!series) {
    return null;
  }

  const readerData = await fetchQuery(api.chapters.getReaderData, {
    slug,
    chapterNumber: chapterNum,
  });

  if (!readerData) {
    return null;
  }

  return {
    series,
    readerData,
  };
});

export async function generateMetadata({ params }: ReaderPageProps) {
  const { slug, chapterNumber } = await params;
  const chapterNum = parseInt(chapterNumber.split("-")[1], 10);

  const data = await fetchReaderData(slug, chapterNum);

  if (!data) {
    return {
      title: "Chapter Not Found",
      description: "The requested chapter does not exist.",
    };
  }

  return {
    title: `${data.series.title} - ${
      data.readerData?.title || `Chapter ${chapterNum}`
    }`,
    description: `Read ${
      data.readerData?.title || `Chapter ${chapterNum}`
    } of ${data.series.title}.`,
  };
}

export default async function ReaderPage({ params }: ReaderPageProps) {
  const { slug, chapterNumber } = await params;
  const chapterNum = parseInt(chapterNumber.split("-")[1], 10);

  const data = await fetchReaderData(slug, chapterNum);

  if (!data) {
    notFound();
  }

  // Get all chapters to check for navigation
  const allChapters = await fetchQuery(api.chapters.getAllChapters, {
    seriesId: data.series._id,
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
  const pages = data.readerData.pageUrls.map((url, index) => ({
    _id: `page-${index}`,
    pageNumber: index + 1,
    imageUrl: url,
  }));

  // Prepare chapter list for selector
  const chapterList = allChapters
    .map((ch) => ({
      number: ch.chapterNumber,
      title: ch.title,
      _id: ch._id,
    }))
    .sort((a, b) => b.number - a.number);

  return (
    <Reader
      seriesSlug={slug}
      seriesTitle={data.series.title}
      chapterNumber={chapterNum}
      chapterId={data.readerData.chapterId}
      chapterTitle={currentChapter?.title}
      pages={pages}
      hasNextChapter={hasNextChapter}
      hasPrevChapter={hasPrevChapter}
      chapters={chapterList}
    />
  );
}
