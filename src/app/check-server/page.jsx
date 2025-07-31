"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function CheckServerPage() {
  const router = useRouter();

  const [loadSteps, setLoadSteps] = useState({
    health: false,
    user: false,
    navigate: false,
  });

  const stepsTotal = 3;
  const doneCount = Object.values(loadSteps).filter(Boolean).length;
  const progress = Math.round((doneCount / stepsTotal) * 100);

  const [isDown, setIsDown] = useState(true);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerInterval = useRef<NodeJS.Timeout | null>(null);

  const checkStrapiHealth = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/healthz`);
      if (!res.ok) throw new Error("Health check failed");
      setLoadSteps((prev) => ({ ...prev, health: true }));
      setIsDown(false);
    } catch {
      setIsDown(true);
      setLoadSteps({ health: false, user: false, navigate: false });
    }
  };

  const checkUserAndRedirect = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("User not authenticated");
      setLoadSteps((prev) => ({ ...prev, user: true }));

      const data = await res.json();
      const roleName =
        data?.role?.name?.toLowerCase() ||
        data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() ||
        null;

      const lastPath = sessionStorage.getItem("lastVisitedPath");

      setTimeout(() => {
        setLoadSteps((prev) => ({ ...prev, navigate: true }));

        if (roleName === "admin") {
          sessionStorage.removeItem("lastVisitedPath");
          router.replace("/admin/dashboard");
        } else if (lastPath && lastPath !== "/check-server") {
          router.replace(lastPath);
        } else {
          router.replace("/welcome");
        }
      }, 500);
    } catch (err) {
      router.replace("/login");
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    checkStrapiHealth();
    const interval = setInterval(checkStrapiHealth, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isDown) {
      timerInterval.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
      setElapsedTime(0);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isDown]);

  useEffect(() => {
    if (loadSteps.health && !loadSteps.user) {
      checkUserAndRedirect();
    }
  }, [loadSteps.health]);

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = elapsedTime % 60;
  const formattedTime = `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;

  return (
    <div className="flex items-center justify-center min-h-screen px-6 select-none">
      <div className="relative max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center ring-4 ring-[#30266D]">
        <div className="mb-6">
          <Image
            src="/medcmu2.png"
            width={200}
            height={200}
            alt="Logo"
            className="mx-auto mb-4 animate-bounce"
          />
        </div>
        {isDown ? (
          <>
            <h1 className="text-2xl font-bold mb-4 text-[#F9669D]">ระบบขาดการเชื่อมต่อ</h1>
            <p className="text-gray-600 mb-4 text-sm">
              กรุณารอสักครู่ หากรอเกิน 5 นาที กรุณาแจ้งเจ้าหน้าที่
            </p>
            <div className="inline-block px-4 py-2 rounded-full bg-[#30266D] bg-opacity-90 text-white  text-lg tracking-wider shadow">
              เวลาที่รอ: {formattedTime}
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-4 text-[#30266D]">เชื่อมต่อสำเร็จ กำลังโหลด...</h1>
            <div className="w-full h-5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#30266D] to-[#F9669D] transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-[#30266D] font-semibold">{progress}%</p>
          </>
        )}
      </div>
    </div>
  );
}
