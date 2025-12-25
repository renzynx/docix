package tasks

// Task type constants
const (
	TypeImageConvert   = "image:convert"
	TypeImageThumbnail = "image:thumbnail"
	TypeImageOptimize  = "image:optimize"
	TypeImageDelete    = "image:delete"
	TypeCleanupOrphans = "cleanup:orphans"
	TypeViewSync       = "views:sync"
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
