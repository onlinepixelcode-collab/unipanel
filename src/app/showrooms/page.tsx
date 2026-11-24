import type { Metadata } from "next";
import { ShowroomsPage } from "@/components/pages/ShowroomsPage";
export const metadata: Metadata = { title: "Showrooms · Johannesburg, Cape Town, Durban", description: "Visit UnipanelSA in Kramerville (Sandton), Paarden Eiland (Cape Town) or Jacobs (Durban). Hours, live open status, directions and visit booking." };
export default function Page() {
  return <ShowroomsPage />;
}
