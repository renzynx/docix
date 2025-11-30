"use client";

import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { StatsCard } from "@/components/analytics/stats-card";
import { Loader2, BookOpen, Users, FileText, Layers, Heart, Bell, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AnalyticsDashboard() {
  const analytics = useQuery(api.analytics.getAllAnalytics);
  const summary = useQuery(api.analytics.getAnalyticsSummary);

  if (!analytics || !summary) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Stats */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Overview</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Series"
            value={analytics.series}
            description="Manga & Comics"
            icon={BookOpen}
          />
          <StatsCard
            title="Total Users"
            value={analytics.users}
            description="Registered users"
            icon={Users}
          />
          <StatsCard
            title="Total Chapters"
            value={analytics.chapters}
            description="Published chapters"
            icon={FileText}
          />
          <StatsCard
            title="Total Pages"
            value={analytics.pages}
            description="Content pages"
            icon={Layers}
          />
        </div>
      </div>

      {/* Engagement Stats */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Engagement</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Total Favorites"
            value={analytics.favorites}
            description="Series bookmarked"
            icon={Heart}
          />
          <StatsCard
            title="Notifications"
            value={analytics.notifications}
            description="System notifications"
            icon={Bell}
          />
          <StatsCard
            title="Genres"
            value={analytics.genres}
            description="Content categories"
            icon={Tag}
          />
        </div>
      </div>

      {/* Detailed Metrics */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Content Metrics</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Avg. Chapters per Series
              </CardTitle>
              <CardDescription>Content depth indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averageChaptersPerSeries.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.chapters} chapters / {analytics.series} series
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Avg. Pages per Chapter
              </CardTitle>
              <CardDescription>Chapter length indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averagePagesPerChapter.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.pages} pages / {analytics.chapters} chapters
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">
                Avg. Favorites per Series
              </CardTitle>
              <CardDescription>Popularity indicator</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics.averageFavoritesPerSeries.toFixed(1)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {analytics.favorites} favorites / {analytics.series} series
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Summary Breakdown */}
      <div>
        <h2 className="text-2xl font-bold mb-4">Detailed Summary</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Content Overview</CardTitle>
              <CardDescription>Total content statistics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Series</span>
                <span className="text-sm font-medium">
                  {summary.overview.totalSeries.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Users</span>
                <span className="text-sm font-medium">
                  {summary.overview.totalUsers.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Chapters</span>
                <span className="text-sm font-medium">
                  {summary.overview.totalChapters.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pages</span>
                <span className="text-sm font-medium">
                  {summary.overview.totalPages.toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>User Engagement</CardTitle>
              <CardDescription>Activity metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Favorites</span>
                <span className="text-sm font-medium">
                  {summary.engagement.totalFavorites.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Notifications
                </span>
                <span className="text-sm font-medium">
                  {summary.engagement.totalNotifications.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Avg. Favorites
                </span>
                <span className="text-sm font-medium">
                  {summary.engagement.averageFavoritesPerSeries.toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Depth</CardTitle>
              <CardDescription>Quality metrics</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Genres</span>
                <span className="text-sm font-medium">
                  {summary.content.totalGenres.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Chapters/Series
                </span>
                <span className="text-sm font-medium">
                  {summary.content.averageChaptersPerSeries.toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">
                  Pages/Chapter
                </span>
                <span className="text-sm font-medium">
                  {summary.content.averagePagesPerChapter.toFixed(1)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
