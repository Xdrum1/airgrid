import { notFound } from "next/navigation";
import { auth } from "@/auth";
import AdminReview from "@/components/AdminReview";

export default async function AdminReviewPage() {
  const session = await auth();
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL;

  if (!adminEmail || session?.user?.email !== adminEmail) {
    notFound();
  }

  return <AdminReview />;
}
