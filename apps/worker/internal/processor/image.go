package processor

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/h2non/bimg"
)

// ImageFormat represents supported image formats
type ImageFormat int

const (
	FormatWebP ImageFormat = iota
	FormatJPEG
	FormatPNG
	FormatAVIF
)

// ImageProcessor handles image conversion and manipulation
type ImageProcessor struct {
	defaultQuality int
}

// NewImageProcessor creates a new image processor
func NewImageProcessor(defaultQuality int) *ImageProcessor {
	if defaultQuality <= 0 || defaultQuality > 100 {
		defaultQuality = 85
	}
	return &ImageProcessor{
		defaultQuality: defaultQuality,
	}
}

// ConvertOptions holds options for image conversion
type ConvertOptions struct {
	Quality   int         // 1-100, 0 uses default
	Format    ImageFormat // Target format
	MaxWidth  int         // Maximum width (0 = no resize)
	MaxHeight int         // Maximum height (0 = no resize)
}

// ConvertResult holds the result of image conversion
type ConvertResult struct {
	OutputPath   string
	OriginalSize int64
	OutputSize   int64
	Width        int
	Height       int
	Format       string
}

// Convert converts an image file to the specified format
func (p *ImageProcessor) Convert(sourcePath, targetPath string, opts ConvertOptions) (*ConvertResult, error) {
	// Read source file
	buffer, err := bimg.Read(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("failed to read source file: %w", err)
	}

	// Get original file size
	sourceInfo, err := os.Stat(sourcePath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat source file: %w", err)
	}

	// Create bimg image
	img := bimg.NewImage(buffer)

	// Get original dimensions
	size, err := img.Size()
	if err != nil {
		return nil, fmt.Errorf("failed to get image size: %w", err)
	}

	// Determine quality
	quality := opts.Quality
	if quality <= 0 || quality > 100 {
		quality = p.defaultQuality
	}

	// Build processing options
	processOpts := bimg.Options{
		Quality: quality,
		Type:    p.toBimgType(opts.Format),
	}

	// Handle resizing if needed
	if opts.MaxWidth > 0 || opts.MaxHeight > 0 {
		newWidth, newHeight := p.calculateDimensions(
			size.Width, size.Height,
			opts.MaxWidth, opts.MaxHeight,
		)
		if newWidth != size.Width || newHeight != size.Height {
			processOpts.Width = newWidth
			processOpts.Height = newHeight
		}
	}

	// Process the image
	newImage, err := img.Process(processOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to process image: %w", err)
	}

	// Ensure target directory exists
	targetDir := filepath.Dir(targetPath)
	if err := os.MkdirAll(targetDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create target directory: %w", err)
	}

	// Write output file
	if err := bimg.Write(targetPath, newImage); err != nil {
		return nil, fmt.Errorf("failed to write output file: %w", err)
	}

	// Get output file info
	outputInfo, err := os.Stat(targetPath)
	if err != nil {
		return nil, fmt.Errorf("failed to stat output file: %w", err)
	}

	// Get new dimensions
	newImg := bimg.NewImage(newImage)
	newSize, _ := newImg.Size()

	return &ConvertResult{
		OutputPath:   targetPath,
		OriginalSize: sourceInfo.Size(),
		OutputSize:   outputInfo.Size(),
		Width:        newSize.Width,
		Height:       newSize.Height,
		Format:       p.formatName(opts.Format),
	}, nil
}

// ConvertToWebP is a convenience method to convert an image to WebP
func (p *ImageProcessor) ConvertToWebP(sourcePath, targetPath string, quality int) (*ConvertResult, error) {
	return p.Convert(sourcePath, targetPath, ConvertOptions{
		Quality: quality,
		Format:  FormatWebP,
	})
}

// IsSupported checks if a file format is supported for reading
func (p *ImageProcessor) IsSupported(path string) bool {
	buffer, err := bimg.Read(path)
	if err != nil {
		return false
	}
	return bimg.DetermineImageType(buffer) != bimg.UNKNOWN
}

// GetImageInfo returns information about an image file
func (p *ImageProcessor) GetImageInfo(path string) (width, height int, format string, err error) {
	buffer, err := bimg.Read(path)
	if err != nil {
		return 0, 0, "", fmt.Errorf("failed to read file: %w", err)
	}

	img := bimg.NewImage(buffer)
	size, err := img.Size()
	if err != nil {
		return 0, 0, "", fmt.Errorf("failed to get size: %w", err)
	}

	imgType := bimg.DetermineImageType(buffer)
	return size.Width, size.Height, p.bimgTypeName(imgType), nil
}

// toBimgType converts our format to bimg type
func (p *ImageProcessor) toBimgType(format ImageFormat) bimg.ImageType {
	switch format {
	case FormatWebP:
		return bimg.WEBP
	case FormatJPEG:
		return bimg.JPEG
	case FormatPNG:
		return bimg.PNG
	case FormatAVIF:
		return bimg.AVIF
	default:
		return bimg.WEBP
	}
}

// formatName returns the string name of a format
func (p *ImageProcessor) formatName(format ImageFormat) string {
	switch format {
	case FormatWebP:
		return "webp"
	case FormatJPEG:
		return "jpeg"
	case FormatPNG:
		return "png"
	case FormatAVIF:
		return "avif"
	default:
		return "unknown"
	}
}

// bimgTypeName returns the string name of a bimg type
func (p *ImageProcessor) bimgTypeName(t bimg.ImageType) string {
	switch t {
	case bimg.WEBP:
		return "webp"
	case bimg.JPEG:
		return "jpeg"
	case bimg.PNG:
		return "png"
	case bimg.GIF:
		return "gif"
	case bimg.AVIF:
		return "avif"
	default:
		return "unknown"
	}
}

// calculateDimensions calculates new dimensions maintaining aspect ratio
func (p *ImageProcessor) calculateDimensions(origWidth, origHeight, maxWidth, maxHeight int) (int, int) {
	if maxWidth <= 0 && maxHeight <= 0 {
		return origWidth, origHeight
	}

	// Calculate ratios
	widthRatio := float64(1)
	heightRatio := float64(1)

	if maxWidth > 0 && origWidth > maxWidth {
		widthRatio = float64(maxWidth) / float64(origWidth)
	}
	if maxHeight > 0 && origHeight > maxHeight {
		heightRatio = float64(maxHeight) / float64(origHeight)
	}

	// Use the smaller ratio to maintain aspect ratio
	ratio := widthRatio
	if heightRatio < widthRatio {
		ratio = heightRatio
	}

	// Don't upscale
	if ratio >= 1 {
		return origWidth, origHeight
	}

	newWidth := int(float64(origWidth) * ratio)
	newHeight := int(float64(origHeight) * ratio)

	return newWidth, newHeight
}

// FormatFromString converts a string to ImageFormat
func FormatFromString(s string) ImageFormat {
	switch s {
	case "webp":
		return FormatWebP
	case "jpeg", "jpg":
		return FormatJPEG
	case "png":
		return FormatPNG
	case "avif":
		return FormatAVIF
	default:
		return FormatWebP
	}
}
