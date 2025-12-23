package rbac

import (
	"context"
	"strings"
	"sync"
	"time"

	"github.com/renzynx/docix/server/internal/constants"
	"github.com/renzynx/docix/server/internal/database"
	"github.com/renzynx/docix/server/internal/models"
	log "github.com/sirupsen/logrus"
	"go.mongodb.org/mongo-driver/v2/bson"
)

type Service struct {
	db         *database.Database
	roleCache  map[bson.ObjectID]*models.Role
	cacheMutex sync.RWMutex
	cacheTime  time.Time
	cacheTTL   time.Duration
}

func NewService(db *database.Database) *Service {
	s := &Service{
		db:        db,
		roleCache: make(map[bson.ObjectID]*models.Role),
		cacheTTL:  5 * time.Minute,
	}
	return s
}

func (s *Service) refreshCacheIfNeeded(ctx context.Context) error {
	s.cacheMutex.RLock()
	needsRefresh := time.Since(s.cacheTime) > s.cacheTTL
	s.cacheMutex.RUnlock()

	if !needsRefresh {
		return nil
	}

	return s.RefreshCache(ctx)
}

func (s *Service) RefreshCache(ctx context.Context) error {
	s.cacheMutex.Lock()
	defer s.cacheMutex.Unlock()

	cursor, err := s.db.Roles.Find(ctx, bson.M{})
	if err != nil {
		return err
	}
	defer cursor.Close(ctx)

	newCache := make(map[bson.ObjectID]*models.Role)
	for cursor.Next(ctx) {
		var role models.Role
		if err := cursor.Decode(&role); err != nil {
			continue
		}
		newCache[role.ID] = &role
	}

	s.roleCache = newCache
	s.cacheTime = time.Now()
	log.Debug("RBAC cache refreshed")
	return nil
}

func (s *Service) GetRole(ctx context.Context, roleID bson.ObjectID) (*models.Role, error) {
	if err := s.refreshCacheIfNeeded(ctx); err != nil {
		return nil, err
	}

	s.cacheMutex.RLock()
	role, exists := s.roleCache[roleID]
	s.cacheMutex.RUnlock()

	if exists {
		return role, nil
	}

	var r models.Role
	err := s.db.Roles.FindOne(ctx, bson.M{"_id": roleID}).Decode(&r)
	if err != nil {
		return nil, err
	}

	s.cacheMutex.Lock()
	s.roleCache[roleID] = &r
	s.cacheMutex.Unlock()

	return &r, nil
}

func (s *Service) GetRoleByName(ctx context.Context, name string) (*models.Role, error) {
	if err := s.refreshCacheIfNeeded(ctx); err != nil {
		return nil, err
	}

	s.cacheMutex.RLock()
	for _, role := range s.roleCache {
		if role.Name == name {
			s.cacheMutex.RUnlock()
			return role, nil
		}
	}
	s.cacheMutex.RUnlock()

	var r models.Role
	err := s.db.Roles.FindOne(ctx, bson.M{"name": name}).Decode(&r)
	if err != nil {
		return nil, err
	}

	s.cacheMutex.Lock()
	s.roleCache[r.ID] = &r
	s.cacheMutex.Unlock()

	return &r, nil
}

func (s *Service) GetUserRoles(ctx context.Context, user *models.User) ([]*models.Role, error) {
	if err := s.refreshCacheIfNeeded(ctx); err != nil {
		return nil, err
	}

	if len(user.RoleIDs) == 0 {
		defaultRole, err := s.GetRoleByName(ctx, "member")
		if err != nil {
			return nil, err
		}
		return []*models.Role{defaultRole}, nil
	}

	roles := make([]*models.Role, 0, len(user.RoleIDs))
	for _, roleID := range user.RoleIDs {
		role, err := s.GetRole(ctx, roleID)
		if err != nil {
			continue
		}
		roles = append(roles, role)
	}

	return roles, nil
}

func (s *Service) GetUserPermissions(ctx context.Context, user *models.User) ([]string, error) {
	roles, err := s.GetUserRoles(ctx, user)
	if err != nil {
		return nil, err
	}

	permSet := make(map[string]struct{})
	for _, role := range roles {
		for _, perm := range role.Permissions {
			permSet[perm] = struct{}{}
		}
	}

	perms := make([]string, 0, len(permSet))
	for perm := range permSet {
		perms = append(perms, perm)
	}

	return perms, nil
}

func (s *Service) UserHasPermission(ctx context.Context, user *models.User, permission string) (bool, error) {
	if user.IsBanned {
		return false, nil
	}

	perms, err := s.GetUserPermissions(ctx, user)
	if err != nil {
		return false, err
	}

	for _, perm := range perms {
		if perm == constants.PermWildcard {
			return true, nil
		}
		if perm == permission {
			return true, nil
		}
		if matchWildcard(perm, permission) {
			return true, nil
		}
	}

	return false, nil
}

func (s *Service) UserHasAnyPermission(ctx context.Context, user *models.User, permissions ...string) (bool, error) {
	for _, perm := range permissions {
		has, err := s.UserHasPermission(ctx, user, perm)
		if err != nil {
			return false, err
		}
		if has {
			return true, nil
		}
	}
	return false, nil
}

func (s *Service) UserHasAllPermissions(ctx context.Context, user *models.User, permissions ...string) (bool, error) {
	for _, perm := range permissions {
		has, err := s.UserHasPermission(ctx, user, perm)
		if err != nil {
			return false, err
		}
		if !has {
			return false, nil
		}
	}
	return true, nil
}

func (s *Service) UserHasRole(ctx context.Context, user *models.User, roleName string) (bool, error) {
	roles, err := s.GetUserRoles(ctx, user)
	if err != nil {
		return false, err
	}

	for _, role := range roles {
		if role.Name == roleName {
			return true, nil
		}
	}

	return false, nil
}

func (s *Service) GetHighestPriorityRole(ctx context.Context, user *models.User) (*models.Role, error) {
	roles, err := s.GetUserRoles(ctx, user)
	if err != nil {
		return nil, err
	}

	if len(roles) == 0 {
		return nil, nil
	}

	highest := roles[0]
	for _, role := range roles[1:] {
		if role.Priority > highest.Priority {
			highest = role
		}
	}

	return highest, nil
}

func (s *Service) CanUserManageRole(ctx context.Context, user *models.User, targetRole *models.Role) (bool, error) {
	userRole, err := s.GetHighestPriorityRole(ctx, user)
	if err != nil {
		return false, err
	}

	if userRole == nil {
		return false, nil
	}

	return userRole.Priority > targetRole.Priority, nil
}

func (s *Service) CanUserManageUser(ctx context.Context, actor *models.User, target *models.User) (bool, error) {
	if actor.ID == target.ID {
		return false, nil
	}

	actorRole, err := s.GetHighestPriorityRole(ctx, actor)
	if err != nil {
		return false, err
	}

	targetRole, err := s.GetHighestPriorityRole(ctx, target)
	if err != nil {
		return false, err
	}

	if actorRole == nil {
		return false, nil
	}

	if targetRole == nil {
		return true, nil
	}

	return actorRole.Priority > targetRole.Priority, nil
}

func (s *Service) AssignRole(ctx context.Context, userID bson.ObjectID, roleID bson.ObjectID) error {
	_, err := s.db.Users.UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{
			"$addToSet": bson.M{"role_ids": roleID},
			"$set":      bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (s *Service) RemoveRole(ctx context.Context, userID bson.ObjectID, roleID bson.ObjectID) error {
	_, err := s.db.Users.UpdateOne(ctx,
		bson.M{"_id": userID},
		bson.M{
			"$pull": bson.M{"role_ids": roleID},
			"$set":  bson.M{"updated_at": time.Now()},
		},
	)
	return err
}

func (s *Service) CreateRole(ctx context.Context, role *models.Role) error {
	now := time.Now()
	role.CreatedAt = now
	role.UpdatedAt = now
	role.IsSystem = false

	result, err := s.db.Roles.InsertOne(ctx, role)
	if err != nil {
		return err
	}

	role.ID = result.InsertedID.(bson.ObjectID)

	s.cacheMutex.Lock()
	s.roleCache[role.ID] = role
	s.cacheMutex.Unlock()

	return nil
}

func (s *Service) UpdateRole(ctx context.Context, roleID bson.ObjectID, updates bson.M) error {
	updates["updated_at"] = time.Now()

	_, err := s.db.Roles.UpdateOne(ctx,
		bson.M{"_id": roleID, "is_system": false},
		bson.M{"$set": updates},
	)
	if err != nil {
		return err
	}

	s.cacheMutex.Lock()
	delete(s.roleCache, roleID)
	s.cacheMutex.Unlock()

	return nil
}

func (s *Service) DeleteRole(ctx context.Context, roleID bson.ObjectID) error {
	result, err := s.db.Roles.DeleteOne(ctx, bson.M{"_id": roleID, "is_system": false})
	if err != nil {
		return err
	}

	if result.DeletedCount == 0 {
		return nil
	}

	_, err = s.db.Users.UpdateMany(ctx,
		bson.M{"role_ids": roleID},
		bson.M{"$pull": bson.M{"role_ids": roleID}},
	)
	if err != nil {
		return err
	}

	s.cacheMutex.Lock()
	delete(s.roleCache, roleID)
	s.cacheMutex.Unlock()

	return nil
}

func (s *Service) GetAllRoles(ctx context.Context) ([]*models.Role, error) {
	cursor, err := s.db.Roles.Find(ctx, bson.M{}, nil)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var roles []*models.Role
	for cursor.Next(ctx) {
		var role models.Role
		if err := cursor.Decode(&role); err != nil {
			continue
		}
		roles = append(roles, &role)
	}

	return roles, nil
}

func matchWildcard(pattern, permission string) bool {
	if !strings.Contains(pattern, "*") {
		return pattern == permission
	}

	patternParts := strings.Split(pattern, ":")
	permParts := strings.Split(permission, ":")

	if len(patternParts) != len(permParts) {
		return false
	}

	for i, patternPart := range patternParts {
		if patternPart == "*" {
			continue
		}
		if patternPart != permParts[i] {
			return false
		}
	}

	return true
}
