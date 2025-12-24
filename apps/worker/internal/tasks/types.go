package tasks

// Task type constants
const (
	// TypeImageConvert converts an uploaded image to WebP format
	TypeImageConvert = "image:convert"

	// TypeImageThumbnail generates a thumbnail for an image (future)
	TypeImageThumbnail = "image:thumbnail"

	// TypeImageOptimize re-optimizes an existing image (future)
	TypeImageOptimize = "image:optimize"

	// TypeImageDelete deletes an image file (future)
	TypeImageDelete = "image:delete"
)

// Queue names
const (
	QueueCritical = "critical"
	QueueDefault  = "default"
	QueueLow      = "low"
)

// Task priorities - used for queue selection
const (
	PriorityCritical = 6
	PriorityDefault  = 3
	PriorityLow      = 1
)
