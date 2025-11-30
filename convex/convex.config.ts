import { defineApp } from "convex/server";
import aggregate from "@convex-dev/aggregate/convex.config";
import shardedCounter from "@convex-dev/sharded-counter/convex.config";

const app = defineApp();

app.use(shardedCounter);

app.use(aggregate, { name: "seriesAggregate" });
app.use(aggregate, { name: "usersAggregate" });
app.use(aggregate, { name: "chaptersAggregate" });
app.use(aggregate, { name: "chaptersBySeries" });
app.use(aggregate, { name: "pagesAggregate" });
app.use(aggregate, { name: "favoritesAggregate" });
app.use(aggregate, { name: "genresAggregate" });
app.use(aggregate, { name: "notificationsAggregate" });

export default app;
