"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import withReactContent from "sweetalert2-react-content";
import { motion } from "framer-motion";

const MySwal = withReactContent(Swal);

export default function PatientInfo() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAlreadyFilled, setIsAlreadyFilled] = useState(false);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    birth_date: "",
    email: "",
    phone: "",
    address: "",
    gender: "",
  });

  useEffect(() => {
    async function checkRoleAndPatient() {
      try {
        // Check user role and data
        const userRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          { method: "GET", credentials: "include" }
        );

        if (!userRes.ok) {
          if (userRes.status === 401) {
            throw new Error("Unauthorized");
          }
          throw new Error("เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ใช้");
        }

        const user = await userRes.json();
        const role = (user.role?.name || "").toLowerCase();

        if (role === "admin") {
          router.replace("/admin/dashboard");
          return;
        }

        // Check if patient data exists
        const patientRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients?filters[user][id][$eq]=${user.id}`,
          { method: "GET", credentials: "include" }
        );

        if (!patientRes.ok) {
          throw new Error("เกิดข้อผิดพลาดขณะโหลดข้อมูลผู้ป่วย");
        }

        const patientData = await patientRes.json();
        const hasPatient = Array.isArray(patientData.data) && patientData.data.length > 0;

        if (hasPatient) {
          setIsAlreadyFilled(true);
          router.replace("/welcome");
          return;
        }

        setUserId(user.id);
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
        }));
        setLoading(false);
      } catch (error) {
        // Replace console.error with SweetAlert2
        await MySwal.fire({
          icon: "error",
          title: "เกิดข้อผิดพลาด",
          text: `ไม่สามารถโหลดข้อมูลได้: ${error.message}`,
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
        router.replace("/login");
      }
    }

    checkRoleAndPatient();
  }, [router]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!userId) {
      return MySwal.fire({
        icon: "warning",
        title: "กรุณาเข้าสู่ระบบ",
        text: "กรุณาเข้าสู่ระบบก่อนกรอกข้อมูล",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
          title: "text-base sm:text-lg font-semibold text-[#1F2937]",
          htmlContainer: "text-sm sm:text-base text-[#4B5563]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#1F2937",
      });
    }

    if (isAlreadyFilled) {
      return MySwal.fire({
        icon: "info",
        title: "ข้อมูลผู้ป่วยมีอยู่แล้ว",
        text: "คุณได้กรอกข้อมูลผู้ป่วยไปแล้ว",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
          title: "text-base sm:text-lg font-semibold text-[#1F2937]",
          htmlContainer: "text-sm sm:text-base text-[#4B5563]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#1F2937",
      });
    }

    const requiredFields = [
      { key: "first_name", label: "ชื่อ" },
      { key: "last_name", label: "นามสกุล" },
      { key: "birth_date", label: "วันเกิด" },
      { key: "phone", label: "เบอร์โทรศัพท์" },
      { key: "address", label: "ที่อยู่" },
      { key: "gender", label: "เพศ" },
    ];

    const emptyFields = requiredFields.filter((field) => {
      const value = formData[field.key];
      return !value || (typeof value === "string" && value.trim() === "");
    });

    if (emptyFields.length > 0) {
      return MySwal.fire({
        icon: "warning",
        title: "ข้อมูลไม่ครบถ้วน",
        html: `กรุณากรอกข้อมูลให้ครบถ้วน: <br /><strong>${emptyFields
          .map((f) => f.label)
          .join(", ")}</strong>`,
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
    }

    const result = await MySwal.fire({
      title: "ยืนยันข้อมูลผู้ป่วย?",
      html: `
        <div style="text-align: left; color: #1F2937;">
          <p><strong>ชื่อ:</strong> ${formData.first_name} ${formData.last_name}</p>
          <p><strong>วันเกิด:</strong> ${dayjs(formData.birth_date).format("DD/MM/YYYY")}</p>
          <p><strong>เบอร์โทร:</strong> ${formData.phone}</p>
          <p><strong>ที่อยู่:</strong> ${formData.address}</p>
          <p><strong>เพศ:</strong> ${
            formData.gender === "male"
              ? "ชาย"
              : formData.gender === "female"
              ? "หญิง"
              : ""
          }</p>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#F9669D",
      cancelButtonColor: "#D1D5DB",
      customClass: {
        popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
        title: "text-base sm:text-lg font-semibold text-[#1F2937]",
        htmlContainer: "text-sm sm:text-base text-[#4B5563]",
        confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        cancelButton: "bg-white text-[#1F2937] px-5 py-3 rounded-lg font-medium border border-[#D1D5DB] hover:bg-[#F9669D]/10 transition-all duration-300 shadow-sm text-sm sm:text-base",
      },
      background: "#FFFFFF",
      color: "#1F2937",
    });

    if (!result.isConfirmed) return;

    const payload = {
      data: {
        first_name: formData.first_name,
        last_name: formData.last_name,
        birth_date: formData.birth_date,
        phone: formData.phone,
        address: formData.address,
        gender: formData.gender,
        email: formData.email,
        is_verified: true,
        user: userId,
      },
    };

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized");
        }
        throw new Error("เกิดข้อผิดพลาดขณะบันทึกข้อมูล");
      }

      await MySwal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว",
        confirmButtonColor: "#F9669D",
        customClass: {
          popup: "rounded-lg shadow-md border border-[#D1D5DB]/50",
          title: "text-base sm:text-lg font-semibold text-[#1F2937]",
          htmlContainer: "text-sm sm:text-base text-[#4B5563]",
          confirmButton: "bg-[#F9669D] text-white px-5 py-3 rounded-lg font-medium hover:bg-[#F9669D]/90 transition-all duration-300 shadow-sm text-sm sm:text-base",
        },
        background: "#FFFFFF",
        color: "#1F2937",
      });

      setIsAlreadyFilled(true);
      router.push("/welcome");
    } catch (error) {
      // Replace console.error with SweetAlert2
      await MySwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
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
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ backgroundColor: "#FFFFFF" }}
      >
        <p className="text-center text-lg font-semibold" style={{ color: "#1F2937" }}>
          กำลังโหลดข้อมูล...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 py-10"
      style={{ backgroundColor: "#FFFFFF" }}
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-white/15 backdrop-blur-2xl rounded-3xl shadow-lg p-8 border space-y-6"
        style={{ borderColor: "#D1D5DB" }}
      >
        <h1
          className="text-3xl font-extrabold mb-6 text-center tracking-wide"
          style={{ color: "#1F2937" }}
        >
          กรอกข้อมูลผู้ป่วย
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="first_name"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              ชื่อ
            </label>
            <input
              type="text"
              name="first_name"
              placeholder="ชื่อ"
              value={formData.first_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="last_name"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              นามสกุล
            </label>
            <input
              type="text"
              name="last_name"
              placeholder="นามสกุล"
              value={formData.last_name}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="birth_date"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              วันเกิด
            </label>
            <input
              type="date"
              name="birth_date"
              value={formData.birth_date}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              เบอร์โทรศัพท์
            </label>
            <input
              type="text"
              name="phone"
              placeholder="เบอร์โทรศัพท์"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="address"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              ที่อยู่
            </label>
            <input
              type="text"
              name="address"
              placeholder="ที่อยู่"
              value={formData.address}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            />
          </div>
          <div>
            <label
              htmlFor="gender"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              เพศ
            </label>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="w-full px-4 py-3 border bg-white/10 rounded-xl shadow-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: "#D1D5DB",
                color: "#1F2937",
                backgroundColor: "#FFFFFF/10",
                "--tw-ring-color": "#F9669D",
              }}
            >
              <option value="">เลือกเพศ</option>
              <option value="male">ชาย</option>
              <option value="female">หญิง</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold mb-2"
              style={{ color: "#4B5563" }}
            >
              อีเมล
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              readOnly
              className="w-full px-4 py-3 border bg-gray-100/10 rounded-xl shadow-sm cursor-not-allowed"
              style={{
                borderColor: "#D1D5DB",
                color: "#4B5563",
                backgroundColor: "#FFFFFF/10",
              }}
              placeholder="อีเมล"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 text-white font-semibold rounded-xl shadow-md transition duration-300 hover:scale-105"
            style={{
              backgroundColor: "#F9669D",
            }}
          >
            บันทึกข้อมูลผู้ป่วย
          </button>
        </form>
      </motion.div>
    </div>
  );
}