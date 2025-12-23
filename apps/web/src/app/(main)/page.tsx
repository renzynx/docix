import { FeaturedCarousel } from "./_components/featured-carousel";
import {
	LatestSeriesSection,
	PopularSeriesSection,
} from "./_components/home-sections";

export default function HomePage() {
	return (
		<div className="flex flex-col gap-10">
			{/* Featured Carousel */}
			<FeaturedCarousel />

			{/* Popular Section */}
			<PopularSeriesSection />

			{/* Latest Updates Section */}
			<LatestSeriesSection />
		</div>
	);
}
