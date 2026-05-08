import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { catalogItems } from "~/server/db/schema";

const DEMO_ITEMS = [
  { name: "Bounty Paper Towels", vendor: "Bounty", category: "Paper Goods", packSize: "2 ct", unitType: "case", barcode: "03700037003" },
  { name: "Lysol Disinfecting Wipes", vendor: "Lysol", category: "Cleaning", packSize: "35 ct", unitType: "case", barcode: "01920079145" },
  { name: "Coffee Mate Creamer", vendor: "Nestle", category: "Beverages", packSize: "32 fl oz", unitType: "unit", barcode: "05030050028" },
  { name: "Dixie Paper Plates", vendor: "Dixie", category: "Paper Goods", packSize: "40 ct", unitType: "case", barcode: "04200015452" },
  { name: "Ziploc Sandwich Bags", vendor: "Ziploc", category: "Storage", packSize: "50 ct", unitType: "case", barcode: "02570003872" },
  { name: "Tide Laundry Detergent", vendor: "Tide", category: "Cleaning", packSize: "64 oz", unitType: "unit", barcode: "03700030130" },
  { name: "Glad Trash Bags", vendor: "Glad", category: "Storage", packSize: "20 ct", unitType: "case", barcode: "01200087459" },
  { name: "Cascade Dishwasher Pods", vendor: "Cascade", category: "Cleaning", packSize: "42 ct", unitType: "case", barcode: "03700034782" },
  { name: "Arm & Hammer Baking Soda", vendor: "Arm & Hammer", category: "Baking", packSize: "4 lb", unitType: "unit", barcode: "03320000534" },
  { name: "Dawn Dish Soap", vendor: "Dawn", category: "Cleaning", packSize: "19.4 oz", unitType: "unit", barcode: "03700025420" },
  { name: "Scotch-Brite Sponges", vendor: "Scotch-Brite", category: "Cleaning", packSize: "6 ct", unitType: "case", barcode: "05110072700" },
  { name: "Reynolds Wrap Foil", vendor: "Reynolds", category: "Storage", packSize: "50 sq ft", unitType: "unit", barcode: "00890000128" },
];

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }
  try {
    await db.insert(catalogItems).values(DEMO_ITEMS).onConflictDoNothing();
    return NextResponse.json({ ok: true, seeded: DEMO_ITEMS.length });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
