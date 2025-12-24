package session

import (
	"context"
	"time"

	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

// mongoSession is the MongoDB document structure for sessions.
type mongoSession struct {
	ID        bson.ObjectID `bson:"_id,omitempty"`
	UserID    bson.ObjectID `bson:"user_id"`
	IPAddress string        `bson:"ip_address"`
	UserAgent string        `bson:"user_agent"`
	ExpiresAt time.Time     `bson:"expires_at"`
	CreatedAt time.Time     `bson:"created_at"`
}

// toSession converts a MongoDB session to the interface Session type.
func (m *mongoSession) toSession() *Session {
	return &Session{
		ID:        m.ID.Hex(),
		UserID:    m.UserID.Hex(),
		IPAddress: m.IPAddress,
		UserAgent: m.UserAgent,
		ExpiresAt: m.ExpiresAt,
		CreatedAt: m.CreatedAt,
	}
}

// MongoStore implements Store using MongoDB as the backend.
type MongoStore struct {
	collection *mongo.Collection
}

// NewMongoStore creates a new MongoDB session store.
func NewMongoStore(collection *mongo.Collection) *MongoStore {
	return &MongoStore{collection: collection}
}

// Create stores a new session and returns it with the generated ID.
func (s *MongoStore) Create(ctx context.Context, params CreateParams) (*Session, error) {
	userID, err := bson.ObjectIDFromHex(params.UserID)
	if err != nil {
		return nil, err
	}

	doc := mongoSession{
		UserID:    userID,
		IPAddress: params.IPAddress,
		UserAgent: params.UserAgent,
		ExpiresAt: params.ExpiresAt,
		CreatedAt: time.Now(),
	}

	result, err := s.collection.InsertOne(ctx, doc)
	if err != nil {
		return nil, err
	}

	doc.ID = result.InsertedID.(bson.ObjectID)
	return doc.toSession(), nil
}

// Get retrieves a session by its ID.
func (s *MongoStore) Get(ctx context.Context, id string) (*Session, error) {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil, nil // Invalid ID format, treat as not found
	}

	var doc mongoSession
	err = s.collection.FindOne(ctx, bson.M{"_id": objectID}).Decode(&doc)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil // Not found
		}
		return nil, err
	}

	return doc.toSession(), nil
}

// Delete removes a session by its ID.
func (s *MongoStore) Delete(ctx context.Context, id string) error {
	objectID, err := bson.ObjectIDFromHex(id)
	if err != nil {
		return nil // Invalid ID, nothing to delete
	}

	_, err = s.collection.DeleteOne(ctx, bson.M{"_id": objectID})
	return err
}

// DeleteByUserAndID removes a session for a specific user.
func (s *MongoStore) DeleteByUserAndID(ctx context.Context, userID, sessionID string) (bool, error) {
	userOID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return false, nil
	}

	sessionOID, err := bson.ObjectIDFromHex(sessionID)
	if err != nil {
		return false, nil
	}

	result, err := s.collection.DeleteOne(ctx, bson.M{
		"_id":     sessionOID,
		"user_id": userOID,
	})
	if err != nil {
		return false, err
	}

	return result.DeletedCount > 0, nil
}

// ListByUserID returns all sessions for a given user.
func (s *MongoStore) ListByUserID(ctx context.Context, userID string) ([]Session, error) {
	userOID, err := bson.ObjectIDFromHex(userID)
	if err != nil {
		return nil, nil
	}

	cursor, err := s.collection.Find(ctx, bson.M{"user_id": userOID})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var sessions []Session
	for cursor.Next(ctx) {
		var doc mongoSession
		if err := cursor.Decode(&doc); err != nil {
			continue
		}
		sessions = append(sessions, *doc.toSession())
	}

	return sessions, cursor.Err()
}

// DeleteExpired removes all expired sessions.
func (s *MongoStore) DeleteExpired(ctx context.Context) (int64, error) {
	result, err := s.collection.DeleteMany(ctx, bson.M{
		"expires_at": bson.M{"$lt": time.Now()},
	})
	if err != nil {
		return 0, err
	}
	return result.DeletedCount, nil
}

// Ensure MongoStore implements Store interface.
var _ Store = (*MongoStore)(nil)
