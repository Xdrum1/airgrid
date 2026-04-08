import { redirect } from "next/navigation";

// Self-serve checkout is deprecated. All access is negotiated.
export default function CheckoutPage() {
  redirect("/contact?ref=checkout");
}
