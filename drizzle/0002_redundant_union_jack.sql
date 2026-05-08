CREATE TABLE "smartorder_order_guide_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orderGuideId" uuid NOT NULL,
	"rawName" varchar(512) NOT NULL,
	"normalizedName" varchar(512),
	"vendor" varchar(256),
	"category" varchar(128),
	"packSize" varchar(64),
	"unitType" varchar(32) DEFAULT 'case' NOT NULL,
	"barcode" varchar(64),
	"sortOrder" integer DEFAULT 0 NOT NULL,
	"catalogItemId" uuid,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "smartorder_order_guide" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(256) NOT NULL,
	"vendor" varchar(256),
	"sourceType" varchar(16) NOT NULL,
	"fileUrl" text,
	"createdAt" timestamp with time zone NOT NULL,
	"updatedAt" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "smartorder_order_guide_item" ADD CONSTRAINT "smartorder_order_guide_item_orderGuideId_smartorder_order_guide_id_fk" FOREIGN KEY ("orderGuideId") REFERENCES "public"."smartorder_order_guide"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "smartorder_order_guide_item" ADD CONSTRAINT "smartorder_order_guide_item_catalogItemId_smartorder_catalog_item_id_fk" FOREIGN KEY ("catalogItemId") REFERENCES "public"."smartorder_catalog_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "order_guide_item_guide_idx" ON "smartorder_order_guide_item" USING btree ("orderGuideId");--> statement-breakpoint
CREATE INDEX "order_guide_item_catalog_idx" ON "smartorder_order_guide_item" USING btree ("catalogItemId");--> statement-breakpoint
CREATE INDEX "order_guide_created_at_idx" ON "smartorder_order_guide" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "order_guide_vendor_idx" ON "smartorder_order_guide" USING btree ("vendor");