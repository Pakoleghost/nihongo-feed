import { redirect } from "next/navigation";

export default function ResourcesOldPage() {
  redirect("/study?view=resources");
}
