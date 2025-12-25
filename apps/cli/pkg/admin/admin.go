package admin

import (
	"context"
	"fmt"
	"os"
	"time"

	"github.com/renzynx/docix/cli/pkg/db"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
	"go.mongodb.org/mongo-driver/v2/mongo"
)

func PromoteToAdmin(email string) {
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
			fmt.Println("The user must register first before being promoted to admin.")
			os.Exit(1)
		}
		log.Fatalf("Failed to find user: %v", err)
	}

	var adminRole db.Role
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

func DemoteFromAdmin(email string) {
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

	var adminRole db.Role
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

func ListAdmins() {
	mongoDB, cleanup := db.Connect()
	defer cleanup()

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	users := mongoDB.Collection(db.UsersCollection)
	roles := mongoDB.Collection(db.RolesCollection)

	var adminRole db.Role
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

	var admins []db.User
	for cursor.Next(ctx) {
		var user db.User
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
