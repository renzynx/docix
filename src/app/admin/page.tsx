import { AnalyticsDashboard } from "@/components/admin/analytics/analytics-dashboard";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  description: "Analytics and management dashboard for administrators.",
};

export default function AdminPage() {
  return (
    <div>
      <AnalyticsDashboard />
    </div>
  );
}
