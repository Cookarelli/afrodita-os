import { redirect } from "next/navigation";

export default function PropertyManagerLoginPage() {
  redirect("/login?next=/property-manager");
}
