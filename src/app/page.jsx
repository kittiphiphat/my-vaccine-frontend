"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

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
            return true;
          }
        } catch (err) {
          // No console.error here as it's a retry loop; silently retry
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
        // Replace console.error with SweetAlert2
        await MySwal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: "ไม่สามารถตรวจสอบข้อมูลผู้ใช้ได้ กรุณาลองใหม่",
          confirmButtonColor: "#DC2626",
          customClass: {
            popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
            title: "text-base sm:text-lg font-semibold text-[#1F2937]",
            htmlContainer: "text-sm sm:text-base text-[#4B5563]",
            confirmButton: "bg-[#DC2626] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#DC2626]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
          },
          background: "#FFFFFF",
          color: "#1F2937",
        });

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