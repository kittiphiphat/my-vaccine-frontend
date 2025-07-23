import { Prompt } from "next/font/google";  // นำเข้า Prompt font
import "./globals.css";
import ClientWrapper from "@/components/ClientWrapper";

// ใช้ฟอนต์ Prompt และกำหนดน้ำหนักทั้งหมด
const prompt = Prompt({
  variable: "--font-prompt", // กำหนดตัวแปรสำหรับฟอนต์
  subsets: ["latin"],        // ระบุ subset ของฟอนต์
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"], // ระบุน้ำหนักทั้งหมด
});

export const metadata = {
  title: "MedCMU Vaccine",
  description: "ระบบจองวัคซีน MedCMU",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${prompt.variable} antialiased`}>
        <ClientWrapper>{children}</ClientWrapper> 
      </body>
    </html>
  );
}
