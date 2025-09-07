'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function HospitelEdit({ hospitel, onSave, onCancel, isNew = false }) {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    website: '',
    warningtext: '',
    subwarningtext: '',
  });

  useEffect(() => {
    if (hospitel && !isNew) {
      setForm({
        name: hospitel.name || '',
        phone: hospitel.phone || '',
        website: hospitel.website || '',
        warningtext: hospitel.warningtext || '',
        subwarningtext: hospitel.subwarningtext || '',
      });
    }
  }, [hospitel, isNew]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      data: {
        ...form,
      },
    };

    try {
      if (!isNew) {
        const result = await MySwal.fire({
          title: 'ยืนยันการแก้ไข?',
          text: 'คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonText: 'ใช่, บันทึกเลย',
          cancelButtonText: 'ยกเลิก',
          customClass: {
            popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
            cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
          },
        });

        if (!result.isConfirmed) {
          return;
        }
      }

      if (isNew) {
        await axios.post(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels`, payload, {
          withCredentials: true,
        });
      } else {
        await axios.put(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels/${hospitel.id}`,
          payload,
          { withCredentials: true }
        );
      }

      await MySwal.fire({
        title: 'สำเร็จ',
        text: isNew ? 'สร้างข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });

      onSave();
    } catch (error) {
      const errorMessage = error.response?.data?.error?.message || error.message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถบันทึกข้อมูลได้: ${errorMessage}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-lg p-6 space-y-6 max-w-2xl mx-auto"
    >
      <h3 className="text-xl font-semibold text-[#30266D]">
        {isNew ? 'สร้างข้อมูลใบนัด' : 'แก้ไขข้อมูลใบนัด'}
      </h3>

      <div>
        <label className="block mb-1 font-medium text-[#30266D]">ชื่อโรงพยาบาล</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-[#30266D]">ข้อความเตือน</label>
        <input
          type="text"
          name="warningtext"
          value={form.warningtext}
          onChange={handleChange}
          className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-[#30266D]">คำเตือนย่อย</label>
        <input
          type="text"
          name="subwarningtext"
          value={form.subwarningtext}
          onChange={handleChange}
          className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-[#30266D]">เบอร์โทร</label>
        <input
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium text-[#30266D]">เว็บไซต์</label>
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={handleChange}
          className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
        />
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="submit"
          className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
        >
          บันทึก
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-[#30266D] rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}