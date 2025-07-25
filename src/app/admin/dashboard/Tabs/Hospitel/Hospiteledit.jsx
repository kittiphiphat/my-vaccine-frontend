'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

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
    // ถ้าเป็นการแก้ไข ให้แสดงกล่องยืนยันก่อน
    if (!isNew) {
      const result = await Swal.fire({
        title: 'ยืนยันการแก้ไข?',
        text: 'คุณต้องการบันทึกการเปลี่ยนแปลงใช่หรือไม่',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#30266D',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ใช่, บันทึกเลย',
        cancelButtonText: 'ยกเลิก',
      });

      if (!result.isConfirmed) {
        return; // ถ้าไม่กด "ใช่" ให้หยุดเลย
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

    await Swal.fire({
      icon: 'success',
      title: 'สำเร็จ',
      text: isNew ? 'สร้างข้อมูลเรียบร้อยแล้ว' : 'บันทึกข้อมูลเรียบร้อยแล้ว',
      confirmButtonColor: '#30266D',
    });

    onSave();
  } catch (error) {
    console.error('Error saving hospitel:', error);
    Swal.fire({
      icon: 'error',
      title: 'เกิดข้อผิดพลาด',
      text: 'ไม่สามารถบันทึกข้อมูลได้',
    });
  }
};


  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-6 space-y-4 border border-gray-200"
    >
      <h3 className="text-xl font-semibold text-[#30266D] mb-2">
        {isNew ? 'สร้างข้อมูลใบนัด' : 'แก้ไขข้อมูลใบนัด'}
      </h3>

      <div>
        <label className="block mb-1 font-medium">ชื่อโรงพยาบาล</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full border px-4 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">ข้อความเตือน</label>
        <input
          type="text"
          name="warningtext"
          value={form.warningtext}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">คำเตือนย่อย</label>
        <input
          type="text"
          name="subwarningtext"
          value={form.subwarningtext}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">เบอร์โทร</label>
        <input
          type="text"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1 font-medium">เว็บไซต์</label>
        <input
          type="text"
          name="website"
          value={form.website}
          onChange={handleChange}
          className="w-full border px-4 py-2 rounded-md"
        />
      </div>

      <div className="flex gap-3 mt-4">
        <button
          type="submit"
          className="bg-[#30266D] text-white px-4 py-2 rounded hover:bg-[#1f1b4d] transition"
        >
          {isNew ? 'บันทึก' : 'บันทึก'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400 transition"
        >
          ยกเลิก
        </button>
      </div>
    </form>
  );
}
