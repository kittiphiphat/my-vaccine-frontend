"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { SendHorizontal } from "lucide-react";

export default function WelcomeBack() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    async function checkLogin() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`, {
          credentials: "include",
        });

        if (!res.ok) {
          router.push("/login");
          return;
        }

        const data = await res.json();
        console.log("User data:", data);
        setUser(data);
        setShowWelcome(true);
      } catch (e) {
        console.error("Fetch error:", e);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    checkLogin();
  }, [router]);

  const getRoleName = () => {
  if (!user?.role?.type) return null;
  return user.role.type.toLowerCase();
};;

  const getUsername = () => {
    return user?.username || "พร้อมใช้งานแล้ว 🎉";
  };

  const handleEnter = () => {
    console.log("Enter clicked, role:", getRoleName());
    setIsEntering(true);
    setSlideUp(true);

    setTimeout(() => {
      const role = getRoleName();
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "patient") router.push("/vaccines");
      else router.push("/login");
    }, 800);
  };

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-[#30266D] to-[#F9669D]">
        <svg
          className="animate-spin h-12 w-12 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="white"
            d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
          ></path>
        </svg>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ y: 0 }}
      animate={slideUp ? { y: "-100%" } : { y: 0 }}
      transition={{ duration: 0.6, ease: "easeInOut" }}
      className="w-full h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#F9669D]/10 to-[#30266D]/10"
    >
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            transition={{ duration: 0.6 }}
            className="relative bg-white/80 backdrop-blur-lg border border-white/30 shadow-2xl rounded-3xl p-10 md:p-12 max-w-2xl w-full text-center"
          >
            <div className="mb-6 md:mb-8">
              <Image
                src="https://res.cloudinary.com/dksk7exum/image/upload/v1751438380/logo2_7b39634597.png"
                alt="โลโก้"
                width={100}
                height={100}
                className="mx-auto rounded-xl shadow-md"
                priority
              />
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-[#30266D] mb-4 md:mb-6 drop-shadow-md leading-tight">
              สวัสดีอีกครั้ง! 🎉
            </h1>

            <p className="text-lg md:text-xl text-gray-700 mb-10">
              ยินดีต้อนรับคุณ {getUsername()}
            </p>

            <motion.button
              onClick={handleEnter}
              disabled={isEntering}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-gradient-to-r from-[#F9669D] to-[#30266D] text-white px-8 py-4 text-lg font-bold rounded-full flex items-center justify-center gap-3 shadow-lg transition-all disabled:opacity-50"
            >
              <SendHorizontal className="w-6 h-6" />
              เข้าสู่หน้าหลัก
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
