import { redirect } from "next/navigation";

/**
 * The product entry point is the operational dashboard.
 * Marketing / auth surfaces will live at their own routes later.
 */
export default function RootPage() {
  redirect("/dashboard");
}
