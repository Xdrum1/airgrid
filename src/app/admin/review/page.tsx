import AdminReview from "@/components/AdminReview";

export default function AdminReviewPage() {
  const adminEmail = process.env.ADMIN_NOTIFY_EMAIL ?? "";

  return <AdminReview adminEmail={adminEmail} />;
}
