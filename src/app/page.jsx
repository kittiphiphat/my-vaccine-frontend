"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function waitForStrapi() {
      for (let i = 0; i < 10; i++) {
        try {
          const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`, {
            credentials: "include",
          });

          if (res.status !== 500) {
            return true; // Strapi ตอบกลับแล้ว ไม่ใช่ error ภายใน
          }
        } catch (err) {
          // wait 1 second and retry
        }

        await new Promise((res) => setTimeout(res, 1000));
      }

      return false;
    }

    async function redirectByRole() {
      const isReady = await waitForStrapi();

      if (!isReady) {
        const cachedRole = sessionStorage.getItem("userRole");

        if (cachedRole === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/login");
        }

        return;
      }

      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.replace("/login");
          return;
        }

        const user = await res.json();

        const roleName =
          user?.role?.name?.toLowerCase() ||
          user?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase();

        if (!roleName) {
          router.replace("/login");
          return;
        }

        sessionStorage.setItem("userRole", roleName);

        if (roleName === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/welcome");
        }
      } catch (err) {
        console.error("⛔️ Error fetch user:", err);
        const cachedRole = sessionStorage.getItem("userRole");
        if (cachedRole === "admin") {
          router.replace("/admin/dashboard");
        } else {
          router.replace("/login");
        }
      } finally {
        setChecking(false);
      }
    }

    redirectByRole();
  }, [router]);

  return (
    <div className="w-full h-screen flex items-center justify-center text-lg text-gray-500">
      {checking ? "กำลังตรวจสอบสิทธิ์ผู้ใช้..." : "กำลังเปลี่ยนเส้นทาง..."}
    </div>
  );
}