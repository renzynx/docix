package models

type PaginatedResponse[T any] struct {
	Data       []T   `json:"data"`
	Total      int64 `json:"total"`
	Page       int   `json:"page"`
	Limit      int   `json:"limit"`
	TotalPages int   `json:"total_pages"`
}

type UploadResponse struct {
	URL      string `json:"url"`
	Filename string `json:"filename"`
}

type AsyncUploadResponse struct {
	UploadID string `json:"upload_id"`
	Status   string `json:"status"`
}

type AsyncBulkUploadResponse struct {
	Uploads []AsyncUploadResponse `json:"uploads"`
	Failed  []string              `json:"failed,omitempty"`
}

type UploadStatusResponse struct {
	UploadID string `json:"upload_id"`
	Status   string `json:"status"`
	Filename string `json:"filename,omitempty"`
	Error    string `json:"error,omitempty"`
	Width    int    `json:"width,omitempty"`
	Height   int    `json:"height,omitempty"`
	Size     int64  `json:"size,omitempty"`
}

type BulkUploadResponse struct {
	Uploads []UploadResponse `json:"uploads"`
	Failed  []string         `json:"failed,omitempty"`
}

type DashboardStats struct {
	TotalUsers    int64 `json:"total_users"`
	TotalSeries   int64 `json:"total_series"`
	TotalChapters int64 `json:"total_chapters"`
	TotalViews    int64 `json:"total_views"`

	VerifiedUsers int64 `json:"verified_users"`
	BannedUsers   int64 `json:"banned_users"`

	SeriesByStatus map[string]int64 `json:"series_by_status"`

	UserRegistrations []DailyCount `json:"user_registrations"`
	ChapterUploads    []DailyCount `json:"chapter_uploads"`

	TopSeriesByViews []SeriesViewCount `json:"top_series_by_views"`

	RecentSeries []Series `json:"recent_series"`
	RecentUsers  []User   `json:"recent_users"`
}

type DailyCount struct {
	Date  string `json:"date"`
	Count int64  `json:"count"`
}

type SeriesViewCount struct {
	ID        string `json:"id"`
	Title     string `json:"title"`
	ViewCount int64  `json:"view_count"`
}
