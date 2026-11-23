import type { Metadata } from "next";
import { StoreHeader } from "@/components/store-header";
import { VirtualStore } from "@/components/virtual-store";

export const metadata: Metadata = {
  title: "Virtual Nail Boutique",
  description:
    "Explore the Beautify by Mansi press-on nail collection in a virtual boutique with an interactive Three.js nail preview.",
};

export default function VirtualStorePage() {
  return (
    <>
      <StoreHeader />
      <VirtualStore />
    </>
  );
}
