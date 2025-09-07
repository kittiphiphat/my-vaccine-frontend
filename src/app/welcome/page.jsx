"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { motion, AnimatePresence } from "framer-motion";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

const MySwal = withReactContent(Swal);

const buttonVariants = {
  hover: { scale: 1.05, boxShadow: "0px 6px 24px rgba(0, 0, 0, 0.2)" },
  tap: { scale: 0.95 },
};

const usernameVariants = {
  hover: { scale: 1.05, transition: { duration: 0.2 } },
};

export default function WelcomeBack() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [slideUp, setSlideUp] = useState(false);
  const [isEntering, setIsEntering] = useState(false);

  useEffect(() => {
    async function checkLoginAndPatient() {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized");
          }
          throw new Error("เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ใช้");
        }

        const data = await res.json();
        const roleName = data.role?.name?.toLowerCase();

        // Validate role
        if (!["patient", "admin"].includes(roleName)) {
          // Replace console.error with SweetAlert2
          await MySwal.fire({
            icon: "error",
            title: "บทบาทไม่ถูกต้อง",
            text: "บทบาทผู้ใช้ไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ",
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
          throw new Error("บทบาทผู้ใช้ไม่ถูกต้อง");
        }

        const patientRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${data.id}`,
          {
            method: "GET",
            credentials: "include",
          }
        );

        if (!patientRes.ok) {
          throw new Error("เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ป่วย");
        }

        const patientData = await patientRes.json();
        const hasPatient = Array.isArray(patientData.data) && patientData.data.length > 0;

        if (!hasPatient && roleName === "patient") {
          router.replace("/patient");
          return;
        }

        setUser(data);
        setShowWelcome(true);
      } catch (e) {
        // Replace console.error with SweetAlert2
        await MySwal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: e.message === "Unauthorized" ? "กรุณาเข้าสู่ระบบ" : e.message,
          confirmButtonColor: "#DC2626",
          customClass: {
            popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
            title: "text-base sm:text-lg font-semibold text-[#1F2937]",
            htmlContainer: "text-sm sm:text-base text-[#4B5563]",
            confirmButton: "bg-[#DC2626] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#DC2626]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
          },
          background: "#FFFFFF",
          color: "#1F2937",
        }).then(() => {
          router.push("/login");
        });
      } finally {
        setLoading(false);
      }
    }

    checkLoginAndPatient();
  }, [router]);

  const getRoleName = () => {
    return user?.role?.name?.toLowerCase() || null;
  };

  const getUsername = () => {
    return user?.username || "ผู้ใช้";
  };

  const handleEnter = () => {
    setIsEntering(true);
    setSlideUp(true);

    setTimeout(() => {
      const role = getRoleName();
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "patient") router.push("/vaccines");
      else router.push("/login");
    }, 800);
  };

  return (
    <div
      className="w-full h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, #F9669D10 0%, transparent 50%)",
          opacity: 0.5,
        }}
      />

      <AnimatePresence>
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center"
          >
            <div
              className="border-2 border-[#1F2937]/30 border-t-[#30266D] rounded-full w-6 h-6 animate-spin"
            ></div>
            <p
              className="mt-2 text-sm sm:text-base font-medium"
              style={{ color: "#1F2937" }}
            >
              กำลังโหลด...
            </p>
          </motion.div>
        ) : showWelcome ? (
          <motion.div
            key="welcome"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            transition={{ duration: 0.5 }}
            className="relative bg-white/15 backdrop-blur-2xl border border-opacity-80 shadow-xl rounded-3xl p-6 md:p-8 max-w-md w-full text-center font-poppins"
            style={{ borderColor: "#D1D5DB" }}
          >
            <div className="mb-4 md:mb-6">
              <motion.div
                animate={{
                  y: [0, -10, 0],
                  transition: {
                    repeat: Infinity,
                    duration: 1.2,
                    ease: "easeInOut",
                  },
                }}
              >
                <Image
                  src="/medcmu2.png"
                  alt="โลโก้โรงพยาบาล"
                  width={200}
                  height={200}
                  quality={100}
                  className="mx-auto"
                />
              </motion.div>
            </div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-2xl md:text-3xl font-bold mb-3 md:mb-4 leading-tight"
              style={{ color: "#1F2937" }}
            >
              ยินดีต้อนรับสู่ระบบจองวัคซีน
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-base md:text-lg mb-6 md:mb-8 font-medium"
              style={{ color: "#30266D" }}
            >
              สวัสดีคุณ{" "}
              <motion.span
                variants={usernameVariants}
                whileHover="hover"
                className="font-medium"
                style={{ color: "#F9669D" }}
              >
                {getUsername()}
              </motion.span>{" "}
              เริ่มจองวัคซีนเพื่อสุขภาพของคุณ
            </motion.p>

            <motion.button
              onClick={handleEnter}
              disabled={isEntering}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className={`w-full text-white px-6 py-3 text-base md:text-lg font-semibold rounded-full flex items-center justify-center gap-2 shadow-lg transition-all ${
                isEntering ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              style={{
                backgroundColor: isEntering ? "#F9669D/80" : "#F9669D",
              }}
              aria-label={isEntering ? "กำลังดำเนินการ" : "เริ่มจองวัคซีน"}
            >
              {isEntering ? (
                <span className="flex items-center justify-center gap-2">
                  <div
                    className="border-2 border-[#1F2937]/30 border-t-[#30266D] rounded-full w-4 h-4 animate-spin"
                  ></div>
                  กำลังดำเนินการ...
                </span>
              ) : (
                <>
                  เริ่มจองวัคซีน
                  <PaperAirplaneIcon className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}