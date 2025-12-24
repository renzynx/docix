package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "promote":
		if len(os.Args) < 3 {
			fmt.Println("Error: Email address required")
			fmt.Println("Usage: admin promote <email>")
			os.Exit(1)
		}
		email := os.Args[2]
		promoteToAdmin(email)

	case "list-admins":
		listAdmins()

	case "demote":
		if len(os.Args) < 3 {
			fmt.Println("Error: Email address required")
			fmt.Println("Usage: admin demote <email>")
			os.Exit(1)
		}
		email := os.Args[2]
		demoteFromAdmin(email)

	case "help":
		printUsage()

	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(`
Docix Admin CLI - Manage admin users

Usage:
  admin <command> [arguments]

Commands:
  promote <email>    Promote a user to admin role
  demote <email>     Remove admin role from a user
  list-admins        List all users with admin role
  help               Show this help message

Examples:
  admin promote user@example.com    # Make user an admin
  admin demote user@example.com     # Remove admin role
  admin list-admins                 # Show all admins

Note: The user must already exist (have registered) before being promoted.
`)
}

func connectDB() (*database.Database, func()) {
	db, err := database.New()
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		db.Disconnect(ctx)
	}

	return db, cleanup
}

func promoteToAdmin(email string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the user by email
	var user models.User
	err := db.Users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			fmt.Println("The user must register first before being promoted to admin.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	// Find the admin role
	var adminRole models.Role
	err = db.Roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			fmt.Println("Please start the server once to seed the default roles.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

	// Check if user already has admin role
	for _, roleID := range user.RoleIDs {
		if roleID == adminRole.ID {
			fmt.Printf("User '%s' is already an admin.\n", email)
			os.Exit(0)
		}
	}

	// Add admin role to user
	// First ensure role_ids is an array (handles null case)
	if user.RoleIDs == nil {
		_, err = db.Users.UpdateOne(ctx,
			bson.M{"_id": user.ID},
			bson.M{"$set": bson.M{"role_ids": []bson.ObjectID{}}},
		)
		if err != nil {
			log.Fatalf("Failed to initialize role_ids: %v", err)
		}
	}

	_, err = db.Users.UpdateOne(ctx,
		bson.M{"_id": user.ID},
		bson.M{
			"$addToSet": bson.M{"role_ids": adminRole.ID},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		log.Fatalf("Failed to promote user: %v", err)
	}

	fmt.Printf("✓ Successfully promoted '%s' to admin.\n", email)
	fmt.Println("The user now has full access to the admin panel.")
}

func demoteFromAdmin(email string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the user by email
	var user models.User
	err := db.Users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	// Find the admin role
	var adminRole models.Role
	err = db.Roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

	// Check if user has admin role
	hasAdminRole := false
	for _, roleID := range user.RoleIDs {
		if roleID == adminRole.ID {
			hasAdminRole = true
			break
		}
	}

	if !hasAdminRole {
		fmt.Printf("User '%s' is not an admin.\n", email)
		os.Exit(0)
	}

	// Remove admin role from user
	_, err = db.Users.UpdateOne(ctx,
		bson.M{"_id": user.ID},
		bson.M{
			"$pull": bson.M{"role_ids": adminRole.ID},
			"$set":  bson.M{"updated_at": time.Now()},
		},
	)
	if err != nil {
		log.Fatalf("Failed to demote user: %v", err)
	}

	fmt.Printf("✓ Successfully removed admin role from '%s'.\n", email)
}

func listAdmins() {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Find the admin role
	var adminRole models.Role
	err := db.Roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			fmt.Println("Please start the server once to seed the default roles.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

	// Find all users with admin role
	cursor, err := db.Users.Find(ctx, bson.M{"role_ids": adminRole.ID})
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer cursor.Close(ctx)

	var admins []models.User
	for cursor.Next(ctx) {
		var user models.User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		admins = append(admins, user)
	}

	if len(admins) == 0 {
		fmt.Println("No admin users found.")
		fmt.Println("\nTo promote a user to admin, use:")
		fmt.Println("  go run ./cmd/admin promote <email>")
		return
	}

	fmt.Printf("Found %d admin user(s):\n\n", len(admins))
	for i, admin := range admins {
		username := admin.Username
		if username == "" {
			username = "(no username)"
		}
		fmt.Printf("  %d. %s <%s>\n", i+1, username, admin.Email)
	}
}
