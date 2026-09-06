import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const body = Inter({ subsets: ["latin", "vietnamese"], variable: "--font-body" });
const head = Plus_Jakarta_Sans({
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-head",
});

export const metadata: Metadata = {
  title: "DecisionDesk — Chọn Laptop & Điện thoại (AHP + TOPSIS)",
  description:
    "Hệ hỗ trợ quyết định chọn laptop và điện thoại theo nhu cầu và ngân sách, dùng AHP để tính trọng số và TOPSIS để xếp hạng.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className={`${body.variable} ${head.variable}`}>
      <body>{children}</body>
    </html>
  );
}
