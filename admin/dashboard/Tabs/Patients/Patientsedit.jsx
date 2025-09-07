'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Select from 'react-select';

const MySwal = withReactContent(Swal);

const genderOptions = [
  { value: 'male', label: 'ชาย' },
  { value: 'female', label: 'หญิง' },
];

export default function PatientsEdit({ patient, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    first_name: patient.first_name || '',
    last_name: patient.last_name || '',
    birth_date: patient.birth_date || '',
    gender: patient.gender || '',
    phone: patient.phone || '',
    email: patient.email || '',
    address: patient.address || '',
  });

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleGenderChange = (selectedOption) => {
    setFormData((prev) => ({
      ...prev,
      gender: selectedOption ? selectedOption.value : '',
    }));
  };

  const handleSubmit = async () => {
    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการบันทึกข้อมูลผู้ป่วยนี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
      },
    });

    if (!result.isConfirmed) return;

    try {
      const url = `${API_URL}/${patient.id}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ data: formData }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(message);
      }

      MySwal.fire({
        title: 'สำเร็จ',
        text: 'ข้อมูลผู้ป่วยถูกบันทึกเรียบร้อยแล้ว',
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
      MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`,
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
    <div className="max-w-3xl mx-auto p-6 bg-white rounded-2xl shadow-lg ">
      <h3 className="text-xl font-semibold text-[#30266D] mb-6">แก้ไขข้อมูลผู้ป่วย</h3>

      <div className="space-y-6">
        <div>
          <label className="block mb-1 font-medium text-[#30266D]">ชื่อ</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">นามสกุล</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">วันเกิด</label>
          <input
            type="date"
            name="birth_date"
            value={formData.birth_date}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">เพศ</label>
          <Select
            options={genderOptions}
            value={genderOptions.find((option) => option.value === formData.gender) || null}
            onChange={handleGenderChange}
            placeholder="-- กรุณาเลือกเพศ --"
            className="w-full"
            classNamePrefix="react-select"
            isClearable
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: '#fff',
                borderColor: '#30266D80',
                borderRadius: '0.75rem',
                padding: '0.5rem',
                boxShadow: 'none',
                '&:hover': { borderColor: '#F9669D' },
                '&:focus-within': { borderColor: '#F9669D', boxShadow: '0 0 0 2px #F9669D80' },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: '#fff',
                border: '1px solid #30266D80',
                borderRadius: '0.75rem',
                marginTop: '0.25rem',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isFocused ? '#F9669D1A' : '#fff',
                color: '#30266D',
                cursor: 'pointer',
                '&:hover': { backgroundColor: '#F9669D1A' },
              }),
              singleValue: (base) => ({
                ...base,
                color: '#30266D',
              }),
              placeholder: (base) => ({
                ...base,
                color: '#6B7280',
              }),
            }}
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">เบอร์โทร</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">อีเมล</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div>
          <label className="block mb-1 font-medium text-[#30266D]">ที่อยู่</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className="w-full rounded-xl border border-[#30266D]/50 bg-white text-[#30266D] focus:ring-2 focus:ring-[#F9669D] px-4 py-2"
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 text-[#30266D] rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-[#F9669D] text-white rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}