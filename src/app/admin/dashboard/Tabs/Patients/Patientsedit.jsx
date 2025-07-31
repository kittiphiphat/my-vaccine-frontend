'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';
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
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };


  const handleGenderChange = (selectedOption) => {
    setFormData(prev => ({
      ...prev,
      gender: selectedOption ? selectedOption.value : '',
    }));
  };

  const calculateAge = (birthDate) => {
    if (!birthDate) return '';
    const birth = dayjs(birthDate);
    const today = dayjs();
    return today.diff(birth, 'year');
  };

  const handleSubmit = async () => {
    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการบันทึกข้อมูลผู้ป่วยนี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'บันทึก',
      cancelButtonText: 'ยกเลิก',
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
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status} - ${errorText}`);
      }

      MySwal.fire('สำเร็จ!', 'ข้อมูลผู้ป่วยถูกบันทึกเรียบร้อยแล้ว', 'success');
      onSave();
    } catch (error) {
      console.error('Error on fetch:', error);
      MySwal.fire('เกิดข้อผิดพลาด', `ไม่สามารถบันทึกข้อมูลได้: ${error.message}`, 'error');
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 border border-gray-300 rounded-md shadow-sm">
      <h3 className="text-xl font-semibold mb-4 text-[#30266D]">แก้ไขข้อมูลผู้ป่วย</h3>

      <div className="space-y-4">
        <div>
          <label className="block font-medium mb-1">ชื่อ</label>
          <input
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">นามสกุล</label>
          <input
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">วันเกิด</label>
          <input
            type="date"
            name="birth_date"
            value={formData.birth_date}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {formData.birth_date && (
          <div>
            <label className="block font-medium mb-1">อายุ</label>
            <input
              type="text"
              readOnly
              value={`${calculateAge(formData.birth_date)} ปี`}
              className="w-full border border-gray-100 bg-gray-100 rounded px-3 py-2 text-gray-700"
            />
          </div>
        )}

        <div>
          <label className="block font-medium mb-1">เพศ</label>
          <Select
            options={genderOptions}
            value={genderOptions.find(option => option.value === formData.gender) || null}
            onChange={handleGenderChange}
            placeholder="-- กรุณาเลือกเพศ --"
            className="w-full"
            classNamePrefix="react-select"
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div>
          <label className="block font-medium mb-1">เบอร์โทร</label>
          <input
            type="text"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">อีเมล</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-medium mb-1">ที่อยู่</label>
          <textarea
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
          >
            ยกเลิก
          </button>
          <button
            onClick={handleSubmit}
            className="bg-[#30266D] text-white px-4 py-2 rounded hover:bg-[#221c59] transition"
          >
            บันทึก
          </button>
        </div>
      </div>
    </div>
  );
}

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: '#30266D',
    borderColor: '#30266D',
    boxShadow: 'none',
    color: 'white',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#30266D',
    color: 'white',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? '#F9669D' : '#30266D',
    color: 'white',
    cursor: 'pointer',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'white',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#ccc',
  }),
};

