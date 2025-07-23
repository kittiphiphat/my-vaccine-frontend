"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Swal from "sweetalert2";
import dayjs from "dayjs";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

export default function PatientInfo() {
  const router = useRouter();

  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true); // เริ่มต้นเป็น true เลย
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
    async function checkRole() {
      try {
        const res = await axios.get(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/users/me?populate=role`,
          {
            withCredentials: true,
          }
        );

        const user = res.data;
        const role = (user.role?.name || "").toLowerCase();

        if (role === "admin") {
          router.replace("/admin/dashboard"); // redirect ทันที
          return; // หยุดต่อ ไม่เซ็ต loading=false เพื่อไม่ให้ UI form แสดง
        }

        // ถ้าไม่ใช่ admin
        setUserId(user.id);
        setFormData((prev) => ({
          ...prev,
          email: user.email || "",
        }));
        setLoading(false); // เมื่อรู้ว่าไม่ใช่ admin ให้แสดง form
      } catch (error) {
        console.error("เช็ค role ผิดพลาด", error);
        router.replace("/login");
      }
    }

    checkRole();
  }, [router]);

  if (loading) {
    // แสดง loading จนกว่าจะรู้ role ว่าไม่ใช่ admin
    return (
      <p className="text-center mt-10 text-[#30266D] font-semibold">
        กำลังโหลดข้อมูล...
      </p>
    );
  }

  // --- ส่วน handleChange, handleSubmit และ UI form เหมือนเดิม ---

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
      });
    }

    if (isAlreadyFilled) {
      return MySwal.fire({
        icon: "info",
        title: "ข้อมูลผู้ป่วยมีอยู่แล้ว",
        text: "คุณได้กรอกข้อมูลผู้ป่วยไปแล้ว",
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
      });
    }

    const result = await MySwal.fire({
      title: "ยืนยันข้อมูลผู้ป่วย?",
      html: `
        <div style="text-align: left;">
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
      confirmButtonColor: "#30266D",
      cancelButtonColor: "#ccc",
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
      await axios.post(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`,
        payload,
        {
          withCredentials: true,
        }
      );

      await MySwal.fire({
        icon: "success",
        title: "บันทึกสำเร็จ",
        text: "บันทึกข้อมูลผู้ป่วยเรียบร้อยแล้ว",
        confirmButtonColor: "#F9669D",
      });

      setIsAlreadyFilled(true);
      router.push("/welcome");
    } catch (error) {
      const errorMsg = error.response
        ? JSON.stringify(error.response.data)
        : error.message;
      MySwal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text: `เกิดข้อผิดพลาด: ${errorMsg}`,
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-8 bg-white rounded-xl shadow-md mt-5">
      <h1 className="text-3xl font-extrabold text-[#30266D] mb-8 text-center">
        กรอกข้อมูลผู้ป่วย
      </h1>
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          name="first_name"
          placeholder="ชื่อ"
          value={formData.first_name}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        />
        <input
          type="text"
          name="last_name"
          placeholder="นามสกุล"
          value={formData.last_name}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        />
        <input
          type="date"
          name="birth_date"
          value={formData.birth_date}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        />
        <input
          type="text"
          name="phone"
          placeholder="เบอร์โทรศัพท์"
          value={formData.phone}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        />
        <input
          type="text"
          name="address"
          placeholder="ที่อยู่"
          value={formData.address}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        />
        <select
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          className="w-full border border-[#30266D] p-3 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#30266D]"
        >
          <option value="">เลือกเพศ</option>
          <option value="male">ชาย</option>
          <option value="female">หญิง</option>
        </select>
        <input
          type="email"
          name="email"
          value={formData.email}
          readOnly
          className="w-full border border-gray-300 p-3 bg-gray-100 text-gray-700 rounded-lg cursor-not-allowed"
          placeholder="อีเมล"
        />
        <button
          type="submit"
          className="w-full bg-[#F9669D] hover:bg-pink-500 text-white font-semibold py-3 rounded-lg shadow-md transition duration-300"
        >
          บันทึกข้อมูลผู้ป่วย
        </button>
      </form>
    </div>
  );
}