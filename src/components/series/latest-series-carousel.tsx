"use client";

import { api } from "@convex/_generated/api";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "../ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";
import { SeriesCard } from "./series-card";

type LatestSeriesCarouselProps = {
  series: (typeof api.series.getLatestSeries)["_returnType"];
};

export const LatestSeriesCarousel = ({ series }: LatestSeriesCarouselProps) => {
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: true }));

  if (!series || series.length === 0) {
    return null;
  }

  return (
    <div className="w-full mb-12">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Latest Updates</h2>
      </div>
      <Carousel
        opts={{
          align: "start",
          loop: true,
        }}
        plugins={[plugin.current]}
        className="w-full"
        onMouseEnter={plugin.current.stop}
        onMouseLeave={plugin.current.reset}
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {series.map((item) => (
            <CarouselItem
              key={item._id}
              className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5"
            >
              <SeriesCard series={item} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="left-2 h-8 w-8 lg:left-0 lg:-translate-x-1/2" />
        <CarouselNext className="right-2 h-8 w-8 lg:right-0 lg:translate-x-1/2" />
      </Carousel>
    </div>
  );
};
