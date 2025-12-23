"use client";

import { cn } from "@docix/ui/lib/utils";
import { useCallback, useRef, useState } from "react";

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
	/** Fallback content to show when image fails to load */
	fallback?: React.ReactNode;
	/** Custom skeleton className */
	skeletonClassName?: string;
	/** Aspect ratio for the skeleton (e.g., "16/9", "1/1", "2/3") */
	aspectRatio?: string;
}

function Image({
	src,
	alt,
	className,
	fallback,
	skeletonClassName,
	aspectRatio,
	style,
	onLoad,
	onError,
	...props
}: ImageProps) {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const imgRef = useRef<HTMLImageElement>(null);

	// Use callback ref to check if image is already loaded (cached)
	const setImgRef = useCallback(
		(node: HTMLImageElement | null) => {
			if (node) {
				// If the image is already complete (cached), mark as loaded
				if (node.complete && node.naturalWidth > 0) {
					setIsLoading(false);
				}
			}
			(imgRef as React.MutableRefObject<HTMLImageElement | null>).current =
				node;
		},
		[], // Only run once on mount
	);

	const handleLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
		setIsLoading(false);
		onLoad?.(e);
	};

	const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
		setIsLoading(false);
		setHasError(true);
		onError?.(e);
	};

	// Filter out Next.js Image specific props that shouldn't be passed to native img
	const {
		priority: _priority,
		fill: _fill,
		sizes: _sizes,
		quality: _quality,
		placeholder: _placeholder,
		blurDataURL: _blurDataURL,
		unoptimized: _unoptimized,
		loader: _loader,
		overrideSrc: _overrideSrc,
		...imgProps
	} = props as typeof props & Record<string, unknown>;

	if (hasError) {
		return (
			<div
				className={cn(
					"flex items-center justify-center bg-muted text-muted-foreground",
					className,
				)}
				style={{ aspectRatio, ...style }}
			>
				{fallback ?? <span className="text-sm">Failed to load</span>}
			</div>
		);
	}

	return (
		<div
			className={cn("relative overflow-hidden", className)}
			style={{ aspectRatio, ...style }}
		>
			{/* Skeleton */}
			{isLoading && (
				<div
					className={cn(
						"absolute inset-0 bg-muted animate-pulse",
						skeletonClassName,
					)}
				/>
			)}

			{/* Image */}
			<img
				ref={setImgRef}
				src={src}
				alt={alt}
				className={cn(
					"size-full object-cover transition-opacity duration-300",
					isLoading ? "opacity-0" : "opacity-100",
				)}
				onLoad={handleLoad}
				onError={handleError}
				{...imgProps}
			/>
		</div>
	);
}

export { Image, type ImageProps };
