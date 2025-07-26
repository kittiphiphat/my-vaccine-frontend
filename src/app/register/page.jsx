"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { motion } from "framer-motion";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // ตรวจสอบว่ากรอกครบทุกช่องหรือไม่
    if (!username || !email || !password || !confirmPassword) {
      Swal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
        confirmButtonColor: "#F9669D",
      });
      return;
    }

    // ตรวจสอบรหัสผ่านซ้ำ
    if (password !== confirmPassword) {
      Swal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        text: "กรุณากรอกยืนยันรหัสผ่านให้ตรงกับรหัสผ่าน",
        confirmButtonColor: "#F9669D",
      });
      return;
    }

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, email, password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "การสมัครสมาชิกล้มเหลว");

      Swal.fire({
        icon: "success",
        title: "สมัครสมาชิกสำเร็จ!",
        text: "กรุณาเข้าสู่ระบบเพื่อใช้งาน",
        confirmButtonColor: "#30266D",
      }).then(() => {
        router.push("/login");
      });
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: "อีเมลหรือชื่อผู้ใช้ถูกใช้ไปแล้ว",
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
        className="max-w-md w-full bg-white rounded-3xl shadow-lg p-10 border border-[#E5D9F2] space-y-8"
      >
        <h1 className="text-4xl font-extrabold text-[#30266D] mb-6 text-center tracking-wide drop-shadow-sm">
          สมัครสมาชิก
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="username"
              className="block text-sm font-semibold text-[#30266D] mb-2"
            >
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ของคุณ"
              className="w-full px-5 py-4 border border-[#D1B3C4] bg-white text-[#30266D] rounded-xl shadow-sm placeholder-[#B87AA6] focus:outline-none focus:ring-4 focus:ring-[#F9669D]/60 transition duration-300"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-[#30266D] mb-2"
            >
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="กรอกอีเมลของคุณ"
              className="w-full px-5 py-4 border border-[#D1B3C4] bg-white text-[#30266D] rounded-xl shadow-sm placeholder-[#B87AA6] focus:outline-none focus:ring-4 focus:ring-[#F9669D]/60 transition duration-300"
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
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-semibold text-[#30266D] mb-2"
            >
              ยืนยันรหัสผ่าน
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 border border-[#D1B3C4] bg-white text-[#30266D] rounded-xl shadow-sm placeholder-[#B87AA6] focus:outline-none focus:ring-4 focus:ring-[#F9669D]/60 transition duration-300"
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 bg-gradient-to-r from-[#F9669D] to-[#30266D] text-white font-semibold rounded-xl shadow-md hover:opacity-90 transition duration-300"
          >
            สมัครสมาชิก
          </button>
        </form>

        <div className="text-center mt-6 text-sm text-[#30266D]">
          <p className="mb-4">
            ถ้าคุณมีบัญชีแล้ว?{" "}
            <a
              href="/login"
              className="text-[#F9669D] font-semibold hover:underline"
            >
              เข้าสู่ระบบที่นี่
            </a>
          </p>

          <p className="text-xs text-[#30266D]/70 select-none tracking-wide">
            &copy; 2025 MedCMU  สงวนลิขสิทธิ์
          </p>
        </div>
      </motion.div>
    </div>
  );
}
