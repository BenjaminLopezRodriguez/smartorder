import { type Metadata } from "next";

import { CameraCapture } from "~/components/backroom/camera-capture";
import { PageHeader } from "~/components/ui/page-header";

export const metadata: Metadata = {
  title: "Capture",
};

export default function BackroomCapturePage() {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PageHeader
        eyebrow="BackroomVision"
        title="Capture a snapshot"
        description="Use your camera to capture current backroom inventory. Snapshots save locally for now."
      />
      <CameraCapture />
    </div>
  );
}

