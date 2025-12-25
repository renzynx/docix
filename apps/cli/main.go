package main

import (
	"context"
	"fmt"
	"os"
	"time"

	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
	"go.mongodb.org/mongo-driver/v2/mongo/options"

	_ "github.com/joho/godotenv/autoload"
)

const (
	databaseName    = "docix"
	usersCollection = "users"
	rolesCollection = "roles"
)

type User struct {
	ID        bson.ObjectID   `bson:"_id,omitempty"`
	Email     string          `bson:"email"`
	Username  string          `bson:"username,omitempty"`
	RoleIDs   []bson.ObjectID `bson:"role_ids,omitempty"`
	CreatedAt time.Time       `bson:"created_at"`
	UpdatedAt time.Time       `bson:"updated_at"`
}

type Role struct {
	ID   bson.ObjectID `bson:"_id,omitempty"`
	Name string        `bson:"name"`
}

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	// Admin role commands
	case "promote":
		requireArg(2, "email", "docix promote <email>")
		promoteToAdmin(os.Args[2])

	case "demote":
		requireArg(2, "email", "docix demote <email>")
		demoteFromAdmin(os.Args[2])

	case "list-admins":
		listAdmins()

	// User management commands
	case "user":
		if len(os.Args) < 3 {
			printUserUsage()
			os.Exit(1)
		}
		handleUserCommand(os.Args[2:])

	case "help":
		printUsage()

	default:
		fmt.Printf("Unknown command: %s\n", command)
		printUsage()
		os.Exit(1)
	}
}

func requireArg(index int, name, usage string) {
	if len(os.Args) <= index {
		fmt.Printf("Error: %s required\n", name)
		fmt.Printf("Usage: %s\n", usage)
		os.Exit(1)
	}
}

func printUsage() {
	fmt.Print(`
Docix CLI - Admin management tool

Usage:
  docix <command> [arguments]

Admin Role Commands:
  promote <email>       Promote a user to admin role
  demote <email>        Remove admin role from a user
  list-admins           List all users with admin role

User Management Commands:
  user list             List all users
  user show <email>     Show user details
  user delete <email>   Delete a user
  user search <query>   Search users by email or username

General:
  help                  Show this help message

Examples:
  docix promote user@example.com
  docix user list
  docix user show user@example.com
  docix user delete user@example.com
  docix user search john

Environment:
  MONGO_URL    MongoDB connection string (required)
`)
}

func printUserUsage() {
	fmt.Print(`
User Management Commands:

Usage:
  docix user <subcommand> [arguments]

Subcommands:
  list                  List all users
  show <email>          Show user details
  delete <email>        Delete a user
  search <query>        Search users by email or username

Examples:
  docix user list
  docix user show user@example.com
  docix user delete user@example.com
  docix user search john
`)
}

func handleUserCommand(args []string) {
	subcommand := args[0]

	switch subcommand {
	case "list":
		listUsers()

	case "show":
		if len(args) < 2 {
			fmt.Println("Error: Email required")
			fmt.Println("Usage: docix user show <email>")
			os.Exit(1)
		}
		showUser(args[1])

	case "delete":
		if len(args) < 2 {
			fmt.Println("Error: Email required")
			fmt.Println("Usage: docix user delete <email>")
			os.Exit(1)
		}
		deleteUser(args[1])

	case "search":
		if len(args) < 2 {
			fmt.Println("Error: Search query required")
			fmt.Println("Usage: docix user search <query>")
			os.Exit(1)
		}
		searchUsers(args[1])

	default:
		fmt.Printf("Unknown user subcommand: %s\n", subcommand)
		printUserUsage()
		os.Exit(1)
	}
}

func connectDB() (*mongo.Database, func()) {
	mongoURL := os.Getenv("MONGO_URL")
	if mongoURL == "" {
		log.Fatal("MONGO_URL environment variable is not set")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(options.Client().ApplyURI(mongoURL))
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	if err := client.Ping(ctx, nil); err != nil {
		log.Fatalf("Failed to ping MongoDB: %v", err)
	}

	cleanup := func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		client.Disconnect(ctx)
	}

	return client.Database(databaseName), cleanup
}

// ============================================================================
// Admin Role Commands
// ============================================================================

func promoteToAdmin(email string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := db.Collection(usersCollection)
	roles := db.Collection(rolesCollection)

	var user User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			fmt.Println("The user must register first before being promoted to admin.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	var adminRole Role
	err = roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			fmt.Println("Please start the server once to seed the default roles.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

	for _, roleID := range user.RoleIDs {
		if roleID == adminRole.ID {
			fmt.Printf("User '%s' is already an admin.\n", email)
			os.Exit(0)
		}
	}

	if user.RoleIDs == nil {
		_, err = users.UpdateOne(ctx,
			bson.M{"_id": user.ID},
			bson.M{"$set": bson.M{"role_ids": []bson.ObjectID{}}},
		)
		if err != nil {
			log.Fatalf("Failed to initialize role_ids: %v", err)
		}
	}

	_, err = users.UpdateOne(ctx,
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

	users := db.Collection(usersCollection)
	roles := db.Collection(rolesCollection)

	var user User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	var adminRole Role
	err = roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

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

	_, err = users.UpdateOne(ctx,
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

	users := db.Collection(usersCollection)
	roles := db.Collection(rolesCollection)

	var adminRole Role
	err := roles.FindOne(ctx, bson.M{"name": "admin"}).Decode(&adminRole)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Println("Error: Admin role not found in database.")
			fmt.Println("Please start the server once to seed the default roles.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find admin role: %v", err)
	}

	cursor, err := users.Find(ctx, bson.M{"role_ids": adminRole.ID})
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer cursor.Close(ctx)

	var admins []User
	for cursor.Next(ctx) {
		var user User
		if err := cursor.Decode(&user); err != nil {
			continue
		}
		admins = append(admins, user)
	}

	if len(admins) == 0 {
		fmt.Println("No admin users found.")
		fmt.Println("\nTo promote a user to admin, use:")
		fmt.Println("  docix promote <email>")
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

// ============================================================================
// User Management Commands
// ============================================================================

func listUsers() {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := db.Collection(usersCollection)

	cursor, err := users.Find(ctx, bson.M{}, options.Find().SetSort(bson.M{"created_at": -1}).SetLimit(50))
	if err != nil {
		log.Fatalf("Failed to query users: %v", err)
	}
	defer cursor.Close(ctx)

	var userList []User
	for cursor.Next(ctx) {
		var user User
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
	fmt.Println("  " + repeatStr("-", 80))

	for i, user := range userList {
		username := user.Username
		if username == "" {
			username = "-"
		}
		created := user.CreatedAt.Format("2006-01-02 15:04")
		fmt.Printf("  %-4d %-30s %-25s %s\n", i+1, truncate(user.Email, 28), truncate(username, 23), created)
	}

	fmt.Printf("\nTotal: %d user(s)\n", len(userList))
}

func showUser(email string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := db.Collection(usersCollection)
	roles := db.Collection(rolesCollection)

	var user User
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
				var role Role
				if err := cursor.Decode(&role); err == nil {
					roleNames = append(roleNames, role.Name)
				}
			}
		}
	}

	fmt.Println("\nUser Details:")
	fmt.Println(repeatStr("-", 40))
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

func deleteUser(email string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := db.Collection(usersCollection)

	var user User
	err := users.FindOne(ctx, bson.M{"email": email}).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			fmt.Printf("Error: User with email '%s' not found.\n", email)
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	// Confirm deletion
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

	// Also delete user's sessions
	sessions := db.Collection("sessions")
	sessions.DeleteMany(ctx, bson.M{"user_id": user.ID})

	// Also delete user's bookmarks
	bookmarks := db.Collection("bookmarks")
	bookmarks.DeleteMany(ctx, bson.M{"user_id": user.ID})

	fmt.Printf("✓ Successfully deleted user '%s' and related data.\n", email)
}

func searchUsers(query string) {
	db, cleanup := connectDB()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := db.Collection(usersCollection)

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

	var userList []User
	for cursor.Next(ctx) {
		var user User
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
	fmt.Println("  " + repeatStr("-", 60))

	for i, user := range userList {
		username := user.Username
		if username == "" {
			username = "-"
		}
		fmt.Printf("  %-4d %-30s %-25s\n", i+1, truncate(user.Email, 28), truncate(username, 23))
	}

	fmt.Printf("\nFound: %d user(s)\n", len(userList))
}

// ============================================================================
// Helpers
// ============================================================================

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-2] + ".."
}

func repeatStr(s string, count int) string {
	result := ""
	for i := 0; i < count; i++ {
		result += s
	}
	return result
}
