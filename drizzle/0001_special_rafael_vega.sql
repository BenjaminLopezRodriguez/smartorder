CREATE TABLE "smartorder_barcode_scan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"rawValue" text NOT NULL,
	"symbology" varchar(32),
	"source" varchar(32) DEFAULT 'camera' NOT NULL,
	"listId" uuid,
	"createdAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "smartorder_barcode_scan" ADD CONSTRAINT "smartorder_barcode_scan_listId_smartorder_list_id_fk" FOREIGN KEY ("listId") REFERENCES "public"."smartorder_list"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "barcode_scan_created_at_idx" ON "smartorder_barcode_scan" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "barcode_scan_raw_value_idx" ON "smartorder_barcode_scan" USING btree ("rawValue");--> statement-breakpoint
CREATE INDEX "barcode_scan_list_idx" ON "smartorder_barcode_scan" USING btree ("listId");