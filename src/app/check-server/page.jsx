"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";

export default function CheckServerPage() {
  const router = useRouter();
  const [isDown, setIsDown] = useState(true);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);

  const progressInterval = useRef(null);
  const healthCheckInterval = useRef(null);
  const timerInterval = useRef(null);
  const isDownRef = useRef(isDown);

  useEffect(() => {
    isDownRef.current = isDown;
  }, [isDown]);

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, "", window.location.href);
    };
    window.history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  async function checkStrapiHealth() {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/healthz`);
      if (!res.ok) throw new Error("Server unhealthy");

      if (isDownRef.current) {
        setIsDown(false);
        setProgress(0);
        setElapsedTime(0);

        if (progressInterval.current) clearInterval(progressInterval.current);
        progressInterval.current = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 100) {
              clearInterval(progressInterval.current);
              progressInterval.current = null;
              return 100;
            }
            return prev + 1;
          });
        }, 60);
      }
    } catch {
      setIsDown(true);
      setProgress(0);
      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  }

  useEffect(() => {
    if (isDown) {
      if (timerInterval.current) clearInterval(timerInterval.current);
      timerInterval.current = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerInterval.current) clearInterval(timerInterval.current);
    }
    return () => {
      if (timerInterval.current) clearInterval(timerInterval.current);
    };
  }, [isDown]);

  useEffect(() => {
    checkStrapiHealth();
    healthCheckInterval.current = setInterval(checkStrapiHealth, 10000);
    return () => {
      clearInterval(healthCheckInterval.current);
      clearInterval(progressInterval.current);
    };
  }, []);

  useEffect(() => {
    if (progress === 100 && !isDown) {
      (async () => {
        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
            { credentials: "include" }
          );
          if (res.status === 200) {
            const data = await res.json();
            const roleName =
              data?.role?.name?.toLowerCase() ||
              data?.data?.attributes?.role?.data?.attributes?.name?.toLowerCase() ||
              null;

            const lastPath = sessionStorage.getItem("lastVisitedPath");

            if (roleName === "admin") {
              sessionStorage.removeItem("lastVisitedPath");
              router.replace("/admin/dashboard");
            } else if (lastPath && lastPath !== "/check-server") {
              router.replace(lastPath);
            } else {
              router.replace("/welcome");
            }
          } else {
            router.replace("/login");
          }
        } catch (err) {
          Swal.fire({
            icon: "error",
            title: "เกิดข้อผิดพลาด",
            text: "ไม่สามารถตรวจสอบผู้ใช้ได้ กรุณาลองอีกครั้ง",
            confirmButtonText: "ตกลง",
            confirmButtonColor: "#30266D",
          });
          router.replace("/login");
        }
      })();
    }
  }, [progress, isDown, router]);

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
            <div className="inline-block px-4 py-2 rounded-full bg-[#30266D] bg-opacity-90 text-white text-lg tracking-wider shadow">
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