package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type CreateTagRequest struct {
	Name        string `json:"name" validate:"required,min=1,max=50"`
	Description string `json:"description" validate:"omitempty,max=500"`
}

type UpdateTagRequest struct {
	Name        *string `json:"name,omitempty" validate:"omitempty,min=1,max=50"`
	Description *string `json:"description,omitempty" validate:"omitempty,max=500"`
}

type CreateSeriesRequest struct {
	Title       string   `json:"title" validate:"required,min=1,max=255"`
	Description string   `json:"description" validate:"omitempty,max=5000"`
	CoverImage  string   `json:"cover_image" validate:"omitempty"`
	Author      string   `json:"author" validate:"omitempty,max=255"`
	Artist      string   `json:"artist" validate:"omitempty,max=255"`
	Status      string   `json:"status" validate:"required,oneof=ongoing completed hiatus cancelled"`
	TagIDs      []string `json:"tag_ids" validate:"omitempty,dive,mongodb"`
}

type UpdateSeriesRequest struct {
	Title       *string  `json:"title,omitempty" validate:"omitempty,min=1,max=255"`
	Description *string  `json:"description,omitempty" validate:"omitempty,max=5000"`
	CoverImage  *string  `json:"cover_image,omitempty" validate:"omitempty"`
	Author      *string  `json:"author,omitempty" validate:"omitempty,max=255"`
	Artist      *string  `json:"artist,omitempty" validate:"omitempty,max=255"`
	Status      *string  `json:"status,omitempty" validate:"omitempty,oneof=ongoing completed hiatus cancelled"`
	TagIDs      []string `json:"tag_ids,omitempty" validate:"omitempty,dive,mongodb"`
}

type ListSeriesRequest struct {
	Page   int    `json:"page" validate:"omitempty,min=1"`
	Limit  int    `json:"limit" validate:"omitempty,min=1,max=100"`
	Status string `json:"status" validate:"omitempty,oneof=ongoing completed hiatus cancelled"`
	Search string `json:"search" validate:"omitempty,max=255"`
	SortBy string `json:"sort_by" validate:"omitempty,oneof=title created_at updated_at view_count chapter_count"`
	Order  string `json:"order" validate:"omitempty,oneof=asc desc"`
}

type CreateChapterRequest struct {
	Number float64 `json:"number" validate:"required,gt=0"`
	Title  string  `json:"title" validate:"omitempty,max=255"`
}

type UpdateChapterRequest struct {
	Number *float64 `json:"number,omitempty" validate:"omitempty,gt=0"`
	Title  *string  `json:"title,omitempty" validate:"omitempty,max=255"`
}

type ChapterWithPages struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	Number    float64       `bson:"number" json:"number"`
	Title     string        `bson:"title,omitempty" json:"title,omitempty"`
	PageCount int           `bson:"page_count" json:"page_count"`
	ViewCount int64         `bson:"view_count" json:"view_count"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
	Pages     []Page        `json:"pages,omitempty"`
}

type CreatePagesRequest struct {
	Pages []CreatePageItem `json:"pages" validate:"required,min=1,dive"`
}

type CreatePageItem struct {
	Number   int    `json:"number" validate:"required,min=1"`
	ImageURL string `json:"image_url" validate:"required"`
}

type UpdatePageRequest struct {
	Number *int `json:"number,omitempty" validate:"omitempty,min=1"`
}

type ReorderPagesRequest struct {
	PageOrders []PageOrder `json:"page_orders" validate:"required,min=1,dive"`
}

type PageOrder struct {
	PageID string `json:"page_id" validate:"required,mongodb"`
	Number int    `json:"number" validate:"required,min=1"`
}

type SeriesWithChapters struct {
	Series   Series    `json:"series"`
	Chapters []Chapter `json:"chapters"`
}

type ChapterNav struct {
	ID     string  `json:"id"`
	Number float64 `json:"number"`
	Title  string  `json:"title,omitempty"`
}

type ChapterReader struct {
	Chapter       Chapter     `json:"chapter"`
	SeriesSlug    string      `json:"series_slug"`
	SeriesTitle   string      `json:"series_title"`
	TotalChapters int         `json:"total_chapters"`
	Pages         []Page      `json:"pages"`
	PrevChapter   *ChapterNav `json:"prev_chapter,omitempty"`
	NextChapter   *ChapterNav `json:"next_chapter,omitempty"`
}
