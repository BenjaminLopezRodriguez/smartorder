import { Camera, Mic, ScanLine, Upload } from "lucide-react";

import { IconTile } from "~/components/ui/icon-tile";
import { Section } from "~/components/ui/section";

const ACTIONS = [
  {
    id: "import",
    icon: Upload,
    label: "Import order guide",
    description: "Upload a PDF or photo. We OCR + structure it.",
    href: "/lists#import",
    emphasis: false,
  },
  {
    id: "voice",
    icon: Mic,
    label: "Voice build list",
    description: "Speak items naturally. We match your catalog.",
    href: "/lists#voice",
    emphasis: false,
  },
  {
    id: "scan",
    icon: ScanLine,
    label: "Start scan session",
    description: "Guide a Zebra-assisted item-by-item run.",
    href: "/lists",
    emphasis: true,
  },
  {
    id: "capture",
    icon: Camera,
    label: "Capture backroom",
    description: "Snapshot inventory for shared visibility.",
    href: "/backroom/capture",
    emphasis: false,
  },
];

export function QuickActions() {
  return (
    <Section title="Quick actions" description="The four core SmartOrder workflows.">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ACTIONS.map((action) => (
          <IconTile
            key={action.id}
            icon={action.icon}
            label={action.label}
            description={action.description}
            href={action.href}
            emphasis={action.emphasis}
          />
        ))}
      </div>
    </Section>
  );
}
