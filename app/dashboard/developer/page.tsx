import { redirect } from "next/navigation";

export default function DeveloperIndexPage() {
  redirect("/dashboard/developer/api-keys");
}
