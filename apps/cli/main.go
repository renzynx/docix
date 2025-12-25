package main

import (
	"fmt"
	"os"

	"github.com/renzynx/docix/cli/pkg/admin"
	"github.com/renzynx/docix/cli/pkg/user"

	_ "github.com/joho/godotenv/autoload"
)

func main() {
	if len(os.Args) < 2 {
		printUsage()
		os.Exit(1)
	}

	command := os.Args[1]

	switch command {
	case "promote":
		requireArg(2, "email", "docix promote <email>")
		admin.PromoteToAdmin(os.Args[2])

	case "demote":
		requireArg(2, "email", "docix demote <email>")
		admin.DemoteFromAdmin(os.Args[2])

	case "list-admins":
		admin.ListAdmins()

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
		user.ListUsers()

	case "show":
		if len(args) < 2 {
			fmt.Println("Error: Email required")
			fmt.Println("Usage: docix user show <email>")
			os.Exit(1)
		}
		user.ShowUser(args[1])

	case "delete":
		if len(args) < 2 {
			fmt.Println("Error: Email required")
			fmt.Println("Usage: docix user delete <email>")
			os.Exit(1)
		}
		user.DeleteUser(args[1])

	case "search":
		if len(args) < 2 {
			fmt.Println("Error: Search query required")
			fmt.Println("Usage: docix user search <query>")
			os.Exit(1)
		}
		user.SearchUsers(args[1])

	default:
		fmt.Printf("Unknown user subcommand: %s\n", subcommand)
		printUserUsage()
		os.Exit(1)
	}
}
