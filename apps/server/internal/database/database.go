package database

import (
	"context"
	"os"
	"time"

	"github.com/renzynx/docix/server/internal/constants"

	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Database struct {
	Client    *mongo.Client
	Users     *mongo.Collection
	Sessions  *mongo.Collection
	Roles     *mongo.Collection
	Tags      *mongo.Collection
	Series    *mongo.Collection
	Chapters  *mongo.Collection
	Pages     *mongo.Collection
	Bookmarks *mongo.Collection
}

func New() (*Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	mongoURL := os.Getenv("MONGO_URL")
	if mongoURL == "" {
		log.Fatal("MONGO_URL environment variable is not set")
	}

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURL))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Info("Connected to MongoDB successfully")

	db := client.Database(constants.DatabaseName)

	database := &Database{
		Client:    client,
		Users:     db.Collection(constants.UsersCollection),
		Sessions:  db.Collection(constants.SessionsCollection),
		Roles:     db.Collection(constants.RolesCollection),
		Tags:      db.Collection(constants.TagsCollection),
		Series:    db.Collection(constants.SeriesCollection),
		Chapters:  db.Collection(constants.ChaptersCollection),
		Pages:     db.Collection(constants.PagesCollection),
		Bookmarks: db.Collection(constants.BookmarksCollection),
	}

	if err := database.createIndexes(ctx); err != nil {
		return nil, err
	}

	if err := database.seedDefaultRoles(ctx); err != nil {
		return nil, err
	}

	return database, nil
}

func (d *Database) createIndexes(ctx context.Context) error {
	_, err := d.Users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "email", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Users.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "username", Value: 1}},
		Options: options.Index().SetUnique(true).SetSparse(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Sessions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Sessions.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "expires_at", Value: 1}},
		Options: options.Index().SetExpireAfterSeconds(0),
	})
	if err != nil {
		return err
	}

	_, err = d.Roles.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Roles.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "priority", Value: -1}},
	})
	if err != nil {
		return err
	}

	// Tags indexes
	_, err = d.Tags.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "name", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Tags.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// Series indexes
	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "slug", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "status", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "type", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "tag_ids", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "view_count", Value: -1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Series.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "title", Value: "text"}},
	})
	if err != nil {
		return err
	}

	// Chapters indexes
	_, err = d.Chapters.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "series_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Chapters.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "series_id", Value: 1}, {Key: "number", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Chapters.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "view_count", Value: -1}},
	})
	if err != nil {
		return err
	}

	// Pages indexes
	_, err = d.Pages.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "chapter_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Pages.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "chapter_id", Value: 1}, {Key: "number", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	// Bookmarks indexes
	_, err = d.Bookmarks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}, {Key: "series_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	})
	if err != nil {
		return err
	}

	_, err = d.Bookmarks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "user_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	_, err = d.Bookmarks.Indexes().CreateOne(ctx, mongo.IndexModel{
		Keys: bson.D{{Key: "series_id", Value: 1}},
	})
	if err != nil {
		return err
	}

	log.Info("Database indexes created successfully")
	return nil
}

func (d *Database) seedDefaultRoles(ctx context.Context) error {
	for _, role := range constants.DefaultRoles {
		count, err := d.Roles.CountDocuments(ctx, bson.M{"name": role.Name})
		if err != nil {
			return err
		}

		if count == 0 {
			now := time.Now()
			_, err := d.Roles.InsertOne(ctx, bson.M{
				"name":         role.Name,
				"display_name": role.DisplayName,
				"description":  role.Description,
				"color":        role.Color,
				"priority":     role.Priority,
				"permissions":  role.Permissions,
				"is_system":    true,
				"created_at":   now,
				"updated_at":   now,
			})
			if err != nil {
				return err
			}
			log.Infof("Created default role: %s", role.Name)
		}
	}
	return nil
}

func (d *Database) Disconnect(ctx context.Context) error {
	if d.Client != nil {
		return d.Client.Disconnect(ctx)
	}
	return nil
}

func (d *Database) GetCollection(database, collection string) *mongo.Collection {
	return d.Client.Database(database).Collection(collection)
}
