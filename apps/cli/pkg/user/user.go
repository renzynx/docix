package user

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/renzynx/docix/cli/pkg/db"
	"github.com/renzynx/docix/cli/pkg/util"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"
)

func ListUsers() {
	mongoDB, cleanup := db.Connect()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := mongoDB.Collection(db.UsersCollection)

	cursor, err := users.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"created_at": -1}).SetLimit(50))
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer cursor.Close(ctx)

	var userList []db.User
	for cursor.Next(ctx) {
		var user db.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		userList = append(userList, user)
	}

	if len(userList) == 0 {
		fmt.Println("No users found.")
		return
	}

	fmt.Printf("Users (showing up to 50, most recent first):\n\n")
	fmt.Printf("  %-4s %-30s %-25s %s\n", "#", "EMAIL", "USERNAME", "CREATED")
	fmt.Println("  " + util.RepeatStr("-", 80))

	for i, user := range userList {
		username := user.Username
		if username == "" {
			username = "-"
		}
		created := user.CreatedAt.Format("2006-01-02 15:04")
		fmt.Printf("  %-4d %-30s %-25s %s\n", i+1, util.Truncate(user.Email, 28), util.Truncate(username, 23), created)
	}

	fmt.Printf("\nTotal: %d user(s)\n", len(userList))
}

func ShowUser(email string) {
	mongoDB, cleanup := db.Connect()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := mongoDB.Collection(db.UsersCollection)
	roles := mongoDB.Collection(db.RolesCollection)

	var user db.User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	var roleNames []string
	if len(user.RoleIDs) > 0 {
		cursor, err := roles.Find(ctx, bson.M{"_id": bson.M{"$in": user.RoleIDs}})
		if err == nil {
			defer cursor.Close(ctx)
			for cursor.Next(ctx) {
				var role db.Role
				if err := cursor.Decode(&role); err == nil {
					roleNames = append(roleNames, role.Name)
				}
			}
		}
	}

	fmt.Println("\nUser Details:")
	fmt.Println(util.RepeatStr("-", 40))
	fmt.Printf("  ID:         %s\n", user.ID.Hex())
	fmt.Printf("  Email:      %s\n", user.Email)
	username := user.Username
	if username == "" {
		username = "(not set)"
	}
	fmt.Printf("  Username:   %s\n", username)

	if len(roleNames) > 0 {
		fmt.Printf("  Roles:      %v\n", roleNames)
	} else {
		fmt.Printf("  Roles:      (none)\n")
	}

	fmt.Printf("  Created:    %s\n", user.CreatedAt.Format("2006-01-02 15:04:05"))
	fmt.Printf("  Updated:    %s\n", user.UpdatedAt.Format("2006-01-02 15:04:05"))
}

func DeleteUser(email string) {
	mongoDB, cleanup := db.Connect()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := mongoDB.Collection(db.UsersCollection)

	var user db.User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	fmt.Printf("Are you sure you want to delete user '%s'? [y/N]: ", email)
	var confirm string
	fmt.Scanln(&confirm)

	if confirm != "y" && confirm != "Y" {
		fmt.Println("Deletion cancelled.")
		return
	}

	result, err := users.DeleteOne(ctx, bson.M{"_id": user.ID})
	if err != nil {
		log.Fatalf("Failed to delete user: %v", err)
	}

	if result.DeletedCount == 0 {
		fmt.Println("Error: User was not deleted.")
		os.Exit(1)
	}

	sessions := mongoDB.Collection("sessions")
	sessions.DeleteMany(ctx, bson.M{"user_id": user.ID})

	bookmarks := mongoDB.Collection("bookmarks")
	bookmarks.DeleteMany(ctx, bson.M{"user_id": user.ID})

	fmt.Printf("✓ Successfully deleted user '%s' and related data.\n", email)
}

func SearchUsers(query string) {
	mongoDB, cleanup := db.Connect()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := mongoDB.Collection(db.UsersCollection)

	filter := bson.M{
		"$or": []bson.M{
			{"email": bson.M{"$regex": query, "$options": "i"}},
			{"username": bson.M{"$regex": query, "$options": "i"}},
		},
	}

	cursor, err := users.Find(ctx, filter, options.Find().SetLimit(20))
	if err != nil {
		log.Fatalf("Failed to search users: %v", err)
	}
	defer cursor.Close(ctx)

	var userList []db.User
	for cursor.Next(ctx) {
		var user db.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		userList = append(userList, user)
	}

	if len(userList) == 0 {
		fmt.Printf("No users found matching '%s'.\n", query)
		return
	}

	fmt.Printf("Search results for '%s':\n\n", query)
	fmt.Printf("  %-4s %-30s %-25s\n", "#", "EMAIL", "USERNAME")
	fmt.Println("  " + util.RepeatStr("-", 60))

	for i, user := range userList {
		username := user.Username
		if username == "" {
			username = "-"
		}
		fmt.Printf("  %-4d %-30s %-25s\n", i+1, util.Truncate(user.Email, 28), util.Truncate(username, 23))
	}

	fmt.Printf("\nFound: %d user(s)\n", len(userList))
}
