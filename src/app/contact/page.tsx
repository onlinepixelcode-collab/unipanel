import type { Metadata } from "next";
import { ContactPage } from "@/components/pages/ContactPage";
export const metadata: Metadata = { title: "Contact & Order Form", description: "Enquire or place an order with the UnipanelSA showroom in Johannesburg, Cape Town or Durban." };
export default function Page() {
  return <ContactPage />;
}
