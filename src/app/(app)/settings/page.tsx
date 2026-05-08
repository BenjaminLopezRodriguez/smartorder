import { type Metadata } from "next";

import { Avatar } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { PageHeader } from "~/components/ui/page-header";
import {
  SettingsGroup,
  SettingsRow,
} from "~/components/settings/settings-row";

export const metadata: Metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <PageHeader
        eyebrow="Account"
        title="Settings"
        description="Organization, scan workflow defaults, and integrations."
      />

      <SettingsGroup
        title="Organization"
        description="Members of this org share the catalog, lists, and BackroomVision feed."
      >
        <SettingsRow
          label="Northside Market"
          description="Owner · 6 members · 2 active locations"
          control={
            <div className="flex items-center gap-3">
              <Avatar name="Northside Market" />
              <Button variant="secondary" size="sm">
                Manage
              </Button>
            </div>
          }
        />
        <SettingsRow
          label="Members"
          description="Invite teammates to share lists and snapshots."
          control={
            <Button variant="secondary" size="sm">
              Invite
            </Button>
          }
        />
        <SettingsRow
          label="Locations"
          description="2 locations · backroom feeds are scoped per location."
          control={<Badge>2 active</Badge>}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Scan workflow"
        description="Defaults for guided Zebra-assisted scan sessions."
      >
        <SettingsRow
          label="Auto-advance after scan"
          description="Move to the next item once a scan is detected and confirmed."
          control={<Badge tone="success">On</Badge>}
        />
        <SettingsRow
          label="Default unit"
          description="Used when an order guide doesn't specify cases vs units."
          control={<Badge>Cases</Badge>}
        />
        <SettingsRow
          label="Front-camera scan detection"
          description="Detect Zebra laser activity via the front camera."
          control={<Badge tone="success">Enabled</Badge>}
        />
      </SettingsGroup>

      <SettingsGroup
        title="OCR & AI"
        description="How order guides and backroom photos are parsed."
      >
        <SettingsRow
          label="OCR provider"
          description="AWS Textract for table-aware extraction."
          control={<Badge>AWS Textract</Badge>}
        />
        <SettingsRow
          label="Confidence threshold"
          description="Items below this score require manual review before saving."
          control={<Badge>70%</Badge>}
        />
        <SettingsRow
          label="Smart recommendations"
          description="Surface forgotten items based on historical ordering patterns."
          control={<Badge tone="success">On</Badge>}
        />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow
          label="Operations Lead"
          description="ops@northsidemarket.com"
          control={
            <Button variant="ghost" size="sm">
              Edit
            </Button>
          }
        />
        <SettingsRow
          label="Sign out"
          description="End the current session on this device."
          control={
            <Button variant="outline" size="sm">
              Sign out
            </Button>
          }
        />
      </SettingsGroup>
    </div>
  );
}
