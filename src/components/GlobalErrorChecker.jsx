"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GlobalErrorChecker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/check-server") return; 

    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me`,
          { credentials: "include" }
        );

        if (res.status === 500) {
          // Redirect ไป check-server
          sessionStorage.setItem("lastVisitedPath", window.location.pathname); 
          window.location.href = "/check-server";
        }
      } catch (error) {
        // ถ้า fetch ผิดพลาด เช่น server ล่ม
        sessionStorage.setItem("lastVisitedPath", window.location.pathname);
        window.location.href = "/check-server";
      }
    }, 1000); 

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}