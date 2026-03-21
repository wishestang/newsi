import { StatusPanel } from "@/components/states/status-panel";
import { isLocalPreviewMode } from "@/lib/env";

export default function TodayPage() {
  if (isLocalPreviewMode()) {
    return (
      <StatusPanel
        label="Preview Mode"
        body="Database and Google OAuth are not configured yet, so Newsi is showing a local preview of the app shell and pages."
      />
    );
  }

  return (
    <StatusPanel
      label="Scheduled"
      body="Your first digest will appear after the next local 07:00 run."
    />
  );
}
