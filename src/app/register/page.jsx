
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import { motion } from "framer-motion";

const MySwal = withReactContent(Swal);

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordCriteria, setPasswordCriteria] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    specialChar: false,
  });

  useEffect(() => {
    setPasswordCriteria({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password),
      specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    });
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedUsername = username.trim();
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    if (!trimmedUsername || !trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      return MySwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบ",
        text: "กรุณากรอกข้อมูลให้ครบทุกช่อง",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      return MySwal.fire({
        icon: "error",
        title: "อีเมลไม่ถูกต้อง",
        text: "กรุณากรอกอีเมลที่ถูกต้อง เช่น user@example.com",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    }

    if (trimmedUsername.length < 3) {
      return MySwal.fire({
        icon: "error",
        title: "ชื่อผู้ใช้สั้นเกินไป",
        text: "ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    }

    const { length, uppercase, lowercase, number, specialChar } = passwordCriteria;
    if (!(length && uppercase && lowercase && number && specialChar)) {
      const errors = [];
      if (!length) errors.push("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
      if (!uppercase) errors.push("รหัสผ่านต้องมีตัวพิมพ์ใหญ่");
      if (!lowercase) errors.push("รหัสผ่านต้องมีตัวพิมพ์เล็ก");
      if (!number) errors.push("รหัสผ่านต้องมีตัวเลข");
      if (!specialChar) errors.push("รหัสผ่านต้องมีอักขระพิเศษ (เช่น !@#$%^&*)");

      return MySwal.fire({
        icon: "error",
        title: "รหัสผ่านไม่รัดกุม",
        html: `กรุณาตั้งรหัสผ่านที่รัดกุม โดย:<br>${errors.map((err) => `• ${err}`).join("<br>")}`,
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    }

    if (trimmedPassword !== trimmedConfirmPassword) {
      return MySwal.fire({
        icon: "error",
        title: "รหัสผ่านไม่ตรงกัน",
        text: "กรุณากรอกยืนยันรหัสผ่านให้ตรงกัน",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: trimmedUsername,
          email: trimmedEmail,
          password: trimmedPassword,
        }),
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage =
          res.status === 400
            ? "อีเมลหรือชื่อผู้ใช้ถูกใช้ไปแล้ว"
            : "การสมัครสมาชิกล้มเหลว กรุณาลองใหม่อีกครั้ง";
        throw new Error(errorMessage);
      }

      await MySwal.fire({
        icon: "success",
        title: "สมัครสมาชิกสำเร็จ!",
        text: `ยินดีต้อนรับ ${data.user.username}! คุณจะถูกนำไปยังหน้าหลัก`,
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });

      router.replace("/welcome");
    } catch (err) {
      await MySwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: err.message || "ไม่สามารถสมัครสมาชิกได้ กรุณาลองใหม่อีกครั้ง",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-xl shadow-lg border border-[#30266D]/50",
          title: "text-base sm:text-lg font-semibold text-[#30266D]",
          htmlContainer: "text-sm sm:text-base text-[#30266D]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-xl font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#30266D",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white/15 backdrop-blur-2xl rounded-3xl shadow-lg p-10 border space-y-8"
        style={{ borderColor: "#30266D" }}
      >
        <h1
          className="text-4xl font-extrabold mb-6 text-center tracking-wide drop-shadow-sm"
          style={{ color: "#30266D" }}
        >
          สมัครสมาชิก
        </h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2" style={{ color: "#30266D" }}>
              ชื่อผู้ใช้
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="กรอกชื่อผู้ใช้ของคุณ"
              className="w-full px-5 py-4 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#30266D",
                color: "#30266D",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2" style={{ color: "#30266D" }}>
              อีเมล
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="กรอกอีเมลของคุณ"
              className="w-full px-5 py-4 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#30266D",
                color: "#30266D",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2" style={{ color: "#30266D" }}>
              รหัสผ่าน
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#30266D",
                color: "#30266D",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
              disabled={isLoading}
            />
            <div className="mt-2 text-sm" style={{ color: "#30266D" }}>
              <p>รหัสผ่านต้องประกอบด้วย:</p>
              <ul className="list-disc list-inside">
                <li className={passwordCriteria.length ? "text-[#F9669D]" : ""}>
                  {passwordCriteria.length ? "✅" : "❌"} ความยาวอย่างน้อย 8 ตัวอักษร
                </li>
                <li className={passwordCriteria.uppercase ? "text-[#F9669D]" : ""}>
                  {passwordCriteria.uppercase ? "✅" : "❌"} ตัวพิมพ์ใหญ่ (A-Z)
                </li>
                <li className={passwordCriteria.lowercase ? "text-[#F9669D]" : ""}>
                  {passwordCriteria.lowercase ? "✅" : "❌"} ตัวพิมพ์เล็ก (a-z)
                </li>
                <li className={passwordCriteria.number ? "text-[#F9669D]" : ""}>
                  {passwordCriteria.number ? "✅" : "❌"} ตัวเลข (0-9)
                </li>
                <li className={passwordCriteria.specialChar ? "text-[#F9669D]" : ""}>
                  {passwordCriteria.specialChar ? "✅" : "❌"} อักขระพิเศษ (เช่น !@#$%^&*)
                </li>
              </ul>
            </div>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2" style={{ color: "#30266D" }}>
              ยืนยันรหัสผ่าน
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-5 py-4 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#30266D",
                color: "#30266D",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 text-white font-semibold rounded-xl shadow-md transition duration-300 hover:scale-105 disabled:opacity-50"
            style={{
              backgroundColor: isLoading ? "#F9669D/80" : "#F9669D",
            }}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <div
                  className="border-2 border-[#30266D]/30 border-t-[#30266D] rounded-full w-4 h-4 animate-spin"
                ></div>
                กำลังสมัคร...
              </span>
            ) : (
              "สมัครสมาชิก"
            )}
          </button>
        </form>

        <div className="text-center mt-6 text-sm" style={{ color: "#30266D" }}>
          <p className="mb-4">
            ถ้ามีบัญชีแล้ว?{" "}
            <a href="/login" className="font-semibold hover:underline" style={{ color: "#F9669D" }}>
              เข้าสู่ระบบที่นี่
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}