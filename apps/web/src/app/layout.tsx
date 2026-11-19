import type { Metadata } from "next";
import { CartProvider } from "@/features/cart/cart-context";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Beautify by Mansi",
    template: "%s | Beautify by Mansi",
  },
  description:
    "Professional makeup artistry and thoughtfully designed press-on nails by Beautify by Mansi.",
  applicationName: "Beautify by Mansi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
