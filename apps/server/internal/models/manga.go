package models

import (
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
)

type SeriesStatus string

const (
	SeriesStatusOngoing   SeriesStatus = "ongoing"
	SeriesStatusCompleted SeriesStatus = "completed"
	SeriesStatusHiatus    SeriesStatus = "hiatus"
	SeriesStatusCancelled SeriesStatus = "cancelled"
)

type Tag struct {
	ID          bson.ObjectID `bson:"_id,omitempty" json:"id"`
	Name        string        `bson:"name" json:"name"`
	Slug        string        `bson:"slug" json:"slug"`
	Description string        `bson:"description,omitempty" json:"description,omitempty"`
	CreatedAt   time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt   time.Time     `bson:"updated_at" json:"updated_at"`
}

type Series struct {
	ID            bson.ObjectID   `bson:"_id,omitempty" json:"id"`
	Title         string          `bson:"title" json:"title"`
	Slug          string          `bson:"slug" json:"slug"`
	Description   string          `bson:"description,omitempty" json:"description,omitempty"`
	CoverImage    string          `bson:"cover_image,omitempty" json:"cover_image,omitempty"`
	CoverImageURL string          `bson:"-" json:"cover_image_url,omitempty"`
	Author        string          `bson:"author,omitempty" json:"author,omitempty"`
	Artist        string          `bson:"artist,omitempty" json:"artist,omitempty"`
	Status        SeriesStatus    `bson:"status" json:"status"`
	TagIDs        []bson.ObjectID `bson:"tag_ids" json:"-"`
	Tags          []Tag           `bson:"-" json:"tags,omitempty"`
	ViewCount     int64           `bson:"view_count" json:"view_count"`
	ChapterCount  int             `bson:"chapter_count" json:"chapter_count"`
	CreatedAt     time.Time       `bson:"created_at" json:"created_at"`
	UpdatedAt     time.Time       `bson:"updated_at" json:"updated_at"`
}

type Chapter struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	Number    float64       `bson:"number" json:"number"`
	Title     string        `bson:"title,omitempty" json:"title,omitempty"`
	PageCount int           `bson:"page_count" json:"page_count"`
	ViewCount int64         `bson:"view_count" json:"view_count"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
	UpdatedAt time.Time     `bson:"updated_at" json:"updated_at"`
}

type Page struct {
	ID             bson.ObjectID `bson:"_id,omitempty" json:"id"`
	ChapterID      bson.ObjectID `bson:"chapter_id" json:"chapter_id"`
	Number         int           `bson:"number" json:"number"`
	ImageURL       string        `bson:"image_url" json:"image_url"`
	ImageURLSigned string        `bson:"-" json:"image_url_signed,omitempty"`
	CreatedAt      time.Time     `bson:"created_at" json:"created_at"`
}

type Bookmark struct {
	ID        bson.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    bson.ObjectID `bson:"user_id" json:"user_id"`
	SeriesID  bson.ObjectID `bson:"series_id" json:"series_id"`
	CreatedAt time.Time     `bson:"created_at" json:"created_at"`
}
