package constants

const (
	CookiePrefix        = "docix_"
	SessionCookieName   = CookiePrefix + "session"
	DatabaseName        = "docix"
	UsersCollection     = "users"
	SessionsCollection  = "sessions"
	RolesCollection     = "roles"
	TagsCollection      = "tags"
	SeriesCollection    = "series"
	ChaptersCollection  = "chapters"
	PagesCollection     = "pages"
	BookmarksCollection = "bookmarks"
)

const (
	PermManagaRead       = "manga:read"
	PermMangaCreate      = "manga:create"
	PermMangaUpdate      = "manga:update"
	PermMangaDelete      = "manga:delete"
	PermMangaPublish     = "manga:publish"
	PermMangaUnpublish   = "manga:unpublish"
	PermMangaFeature     = "manga:feature"
	PermMangaManageTags  = "manga:manage_tags"
	PermMangaBulkActions = "manga:bulk_actions"

	PermChapterRead   = "chapter:read"
	PermChapterCreate = "chapter:create"
	PermChapterUpdate = "chapter:update"
	PermChapterDelete = "chapter:delete"

	PermCommentRead   = "comment:read"
	PermCommentCreate = "comment:create"
	PermCommentUpdate = "comment:update"
	PermCommentDelete = "comment:delete"
	PermCommentPin    = "comment:pin"

	PermUserRead        = "user:read"
	PermUserUpdate      = "user:update"
	PermUserDelete      = "user:delete"
	PermUserBan         = "user:ban"
	PermUserUnban       = "user:unban"
	PermUserManage      = "user:manage"
	PermUserViewIP      = "user:view_ip"
	PermUserImpersonate = "user:impersonate"

	PermRoleRead   = "role:read"
	PermRoleCreate = "role:create"
	PermRoleUpdate = "role:update"
	PermRoleDelete = "role:delete"
	PermRoleAssign = "role:assign"

	PermReportRead    = "report:read"
	PermReportResolve = "report:resolve"
	PermReportDelete  = "report:delete"

	PermBookmarkCreate = "bookmark:create"
	PermBookmarkDelete = "bookmark:delete"
	PermBookmarkRead   = "bookmark:read"

	PermHistoryRead  = "history:read"
	PermHistoryClear = "history:clear"

	PermSettingsRead   = "settings:read"
	PermSettingsUpdate = "settings:update"

	PermAnalyticsRead = "analytics:read"

	PermUploadImages = "upload:images"
	PermUploadBulk   = "upload:bulk"

	PermAdminPanel       = "admin:panel"
	PermAdminDashboard   = "admin:dashboard"
	PermAdminLogs        = "admin:logs"
	PermAdminBackup      = "admin:backup"
	PermAdminMaintenance = "admin:maintenance"

	PermWildcard = "*"
)

var AllPermissions = []string{
	PermManagaRead, PermMangaCreate, PermMangaUpdate, PermMangaDelete,
	PermMangaPublish, PermMangaUnpublish, PermMangaFeature, PermMangaManageTags, PermMangaBulkActions,
	PermChapterRead, PermChapterCreate, PermChapterUpdate, PermChapterDelete,
	PermCommentRead, PermCommentCreate, PermCommentUpdate, PermCommentDelete, PermCommentPin,
	PermUserRead, PermUserUpdate, PermUserDelete, PermUserBan, PermUserUnban, PermUserManage, PermUserViewIP, PermUserImpersonate,
	PermRoleRead, PermRoleCreate, PermRoleUpdate, PermRoleDelete, PermRoleAssign,
	PermReportRead, PermReportResolve, PermReportDelete,
	PermBookmarkCreate, PermBookmarkDelete, PermBookmarkRead,
	PermHistoryRead, PermHistoryClear,
	PermSettingsRead, PermSettingsUpdate,
	PermAnalyticsRead,
	PermUploadImages, PermUploadBulk,
	PermAdminPanel, PermAdminDashboard, PermAdminLogs, PermAdminBackup, PermAdminMaintenance,
}

var DefaultRoles = []struct {
	Name        string
	DisplayName string
	Description string
	Color       string
	Priority    int
	Permissions []string
}{
	{
		Name:        "admin",
		DisplayName: "Administrator",
		Description: "Full system access",
		Color:       "#FF0000",
		Priority:    1000,
		Permissions: []string{PermWildcard},
	},
	{
		Name:        "moderator",
		DisplayName: "Moderator",
		Description: "Content and user moderation",
		Color:       "#00AA00",
		Priority:    500,
		Permissions: []string{
			PermManagaRead, PermMangaUpdate, PermMangaPublish, PermMangaUnpublish, PermMangaFeature,
			PermChapterRead, PermChapterUpdate,
			PermCommentRead, PermCommentUpdate, PermCommentDelete, PermCommentPin,
			PermUserRead, PermUserBan, PermUserUnban,
			PermReportRead, PermReportResolve,
			PermAdminPanel, PermAdminDashboard,
		},
	},
	{
		Name:        "uploader",
		DisplayName: "Uploader",
		Description: "Can upload and manage manga content",
		Color:       "#0066CC",
		Priority:    100,
		Permissions: []string{
			PermManagaRead, PermMangaCreate, PermMangaUpdate,
			PermChapterRead, PermChapterCreate, PermChapterUpdate, PermChapterDelete,
			PermUploadImages, PermUploadBulk,
			PermCommentRead, PermCommentCreate,
		},
	},
	{
		Name:        "vip",
		DisplayName: "VIP Member",
		Description: "Premium member with extra benefits",
		Color:       "#FFD700",
		Priority:    50,
		Permissions: []string{
			PermManagaRead, PermChapterRead,
			PermCommentRead, PermCommentCreate, PermCommentUpdate,
			PermBookmarkCreate, PermBookmarkDelete, PermBookmarkRead,
			PermHistoryRead, PermHistoryClear,
		},
	},
	{
		Name:        "member",
		DisplayName: "Member",
		Description: "Registered user",
		Color:       "#888888",
		Priority:    10,
		Permissions: []string{
			PermManagaRead, PermChapterRead,
			PermCommentRead, PermCommentCreate,
			PermBookmarkCreate, PermBookmarkDelete, PermBookmarkRead,
			PermHistoryRead, PermHistoryClear,
		},
	},
	{
		Name:        "guest",
		DisplayName: "Guest",
		Description: "Non-registered visitor",
		Color:       "#CCCCCC",
		Priority:    0,
		Permissions: []string{
			PermManagaRead, PermChapterRead, PermCommentRead,
		},
	},
}
