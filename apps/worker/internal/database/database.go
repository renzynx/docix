package database

import (
	"context"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

type Client struct {
	*mongo.Client
}

func New(mongoURL string) (*Client, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if mongoURL == "" {
		mongoURL = os.Getenv("MONGO_URL")
	}

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURL))
	if err != nil {
		return nil, err
	}

	if err := client.Ping(ctx, nil); err != nil {
		return nil, err
	}

	log.Info("Connected to MongoDB successfully")

	return &Client{Client: client}, nil
}

func (c *Client) Disconnect(ctx context.Context) error {
	if c.Client != nil {
		return c.Client.Disconnect(ctx)
	}
	return nil
}

func (c *Client) Series() *mongo.Collection {
	return c.Database("docix").Collection("series")
}

func (c *Client) Chapters() *mongo.Collection {
	return c.Database("docix").Collection("chapters")
}

func (c *Client) Pages() *mongo.Collection {
	return c.Database("docix").Collection("pages")
}
