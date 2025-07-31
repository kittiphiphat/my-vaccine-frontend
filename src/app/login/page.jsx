"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { motion } from "framer-motion";  

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();

   
    if (!identifier || !password) {
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกชื่อผู้ใช้หรืออีเมล และรหัสผ่าน",
        confirmButtonColor: "#F9669D",
      });
      return;
    }

    try {
  
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/custom-login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ identifier, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          data.error?.message === "Invalid identifier or password"
            ? "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง"
            : data.error?.message || data.message || "เข้าสู่ระบบไม่สำเร็จ";

        throw new Error(errorMessage);
      }

   
      window.dispatchEvent(new CustomEvent("user-logged-in"));
      sessionStorage.setItem("user-just-logged-in", "true");

      const userId = data.user.id;
      const userRole = data.user.role?.name?.toLowerCase() || "";

      if (userRole === "admin") {
        router.push("/admin/dashboard"); 
        return;
      }

      const patientRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${userId}&populate=user`,
        {
          credentials: "include",
        }
      );

      const patientData = await patientRes.json();
      const hasPatients =
        Array.isArray(patientData.data) && patientData.data.length > 0;

      if (!hasPatients) {
        router.push("/patient"); 
      } else {
        router.push("/welcome"); 
      }
    } catch (err) {
      // แสดงข้อผิดพลาด
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "เข้าสู่ระบบไม่สำเร็จ",
        confirmButtonColor: "#F9669D",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-lg p-12 border border-[#E5D9F2] space-y-8"
      >
        <h1 className="text-4xl font-extrabold text-[#30266D] mb-6 text-center tracking-wide drop-shadow-sm">
          MedCMU Hospital
        </h1>

      
        <motion.form
          onSubmit={handleLogin}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div>
            <label
              htmlFor="identifier"
              className="block text-sm font-semibold text-[#30266D] mb-2"
            >
              ชื่อผู้ใช้ หรือ อีเมล
            </label>
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ หรือ อีเมลของคุณ"
              className="w-full px-5 py-4 border border-[#D1B3C4] bg-white text-[#30266D] rounded-xl shadow-sm placeholder-[#B87AA6] focus:outline-none focus:ring-4 focus:ring-[#F9669D]/60 transition duration-300"
              autoComplete="username"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-semibold text-[#30266D] mb-2"
            >
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 border border-[#D1B3C4] bg-white text-[#30266D] rounded-xl shadow-sm placeholder-[#B87AA6] focus:outline-none focus:ring-4 focus:ring-[#F9669D]/60 transition duration-300"
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-[#F9669D] to-[#30266D] text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition duration-300"
          >
            เข้าสู่ระบบ
          </button>
        </motion.form>

        <div className="text-center mt-4 text-sm text-[#30266D]/80">
          ยังไม่มีบัญชี?{" "}
          <a
            href="/register"
            className="text-[#F9669D] font-semibold hover:underline"
          >
            สมัครสมาชิก
          </a>
        </div>

        <p className="mt-10 text-center text-sm text-[#30266D]/70 select-none tracking-wide">
          &copy; 2025 MedCMU สงวนลิขสิทธิ์
        </p>
      </motion.div>
    </div>
  );
}
