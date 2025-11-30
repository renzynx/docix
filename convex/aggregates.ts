import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { DataModel, Id } from "./_generated/dataModel";

// Global Series Count
export const seriesAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "series";
}>(components.seriesAggregate, {
  sortKey: () => null,
});

// Global Users Count
export const usersAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "users";
}>(components.usersAggregate, {
  sortKey: () => null,
});

// Global Chapters Count
export const chaptersAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "chapters";
}>(components.chaptersAggregate, {
  sortKey: () => null,
});

// Chapters grouped by Series (Namespace = Series ID)
export const chaptersBySeries = new TableAggregate<{
  Namespace: Id<"series">;
  Key: number;
  DataModel: DataModel;
  TableName: "chapters";
}>(components.chaptersBySeries, {
  namespace: (doc) => doc.seriesId,
  sortKey: (doc) => doc.chapterNumber,
});

// Global Pages Count
export const pagesAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "pages";
}>(components.pagesAggregate, {
  sortKey: () => null,
});

// Global Favorites Count
export const favoritesAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "favorites";
}>(components.favoritesAggregate, {
  sortKey: () => null,
});

// Global Genres Count
export const genresAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "genres";
}>(components.genresAggregate, {
  sortKey: () => null,
});

// Global Notifications Count
export const notificationsAggregate = new TableAggregate<{
  Key: null;
  DataModel: DataModel;
  TableName: "notifications";
}>(components.notificationsAggregate, {
  sortKey: () => null,
});
