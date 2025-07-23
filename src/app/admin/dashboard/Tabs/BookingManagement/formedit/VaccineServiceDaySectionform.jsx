'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import Select from 'react-select';

const MySwal = withReactContent(Swal);

const dayOptions = [
  { value: 0, label: 'วันอาทิตย์' },
  { value: 1, label: 'วันจันทร์' },
  { value: 2, label: 'วันอังคาร' },
  { value: 3, label: 'วันพุธ' },
  { value: 4, label: 'วันพฤหัสบดี' },
  { value: 5, label: 'วันศุกร์' },
  { value: 6, label: 'วันเสาร์' },
];

export default function VaccineServiceDayForm({ initialData = {}, onSave, onCancel }) {
  // vaccine initial id as string
  const initialVaccineId =
    initialData.vaccine && initialData.vaccine.id ? String(initialData.vaccine.id) : '';

  const [days, setDays] = useState(initialData.day_of_week || []);
  const [selectedVaccineId, setSelectedVaccineId] = useState(initialVaccineId);
  const [vaccineOptions, setVaccineOptions] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        const options = (data.data || []).map((v) => ({
          value: String(v.id),
          label: v.attributes?.title || `วัคซีน ID: ${v.id}`,
        }));
        setVaccineOptions(options);
      })
      .catch(() => {
        MySwal.fire('ผิดพลาด', 'โหลดข้อมูลวัคซีนล้มเหลว', 'error');
      });
  }, []);

  useEffect(() => {
    setDays(initialData.day_of_week || []);
    setSelectedVaccineId(
      initialData.vaccine && initialData.vaccine.id ? String(initialData.vaccine.id) : ''
    );
  }, [initialData]);

  const toggleDay = (day) => {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (days.length === 0) {
      return MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวันให้บริการอย่างน้อย 1 วัน', 'warning');
    }

    if (!selectedVaccineId) {
      return MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวัคซีนอย่างน้อย 1 รายการ', 'warning');
    }

    const confirmResult = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirmResult.isConfirmed) return;

    const payload = {
      data: {
        day_of_week: days,
        vaccine: selectedVaccineId,
      },
    };

    const method = initialData.id ? 'PUT' : 'POST';
    const url = initialData.id
      ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days/${initialData.id}`
      : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days`;

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message =
          errorData?.error?.message || errorData?.message || res.statusText || 'Unknown error';
        throw new Error(message);
      }

      await MySwal.fire('สำเร็จ', 'บันทึกข้อมูลเรียบร้อย', 'success');
      onSave();
    } catch (error) {
      console.error('Error saving service day:', error);
      MySwal.fire('ผิดพลาด', `เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, 'error');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#30266D] bg-[#FAF9FE] p-6 rounded-md shadow space-y-6 max-w-xl"
    >
      {/* เลือกวัน */}
      <div>
        <label className="font-semibold text-[#30266D] block mb-2">เลือกวันให้บริการ *</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {dayOptions.map(({ value, label }) => (
            <label key={value} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={days.includes(value)}
                onChange={() => toggleDay(value)}
                className="accent-[#30266D]"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* เลือกวัคซีน */}
      <div>
        <label className="font-semibold text-[#30266D] block mb-2">เลือกวัคซีน *</label>
        <Select
          options={vaccineOptions}
          value={vaccineOptions.find((opt) => opt.value === selectedVaccineId) || null}
          onChange={(selected) => setSelectedVaccineId(selected ? selected.value : '')}
          placeholder="เลือกวัคซีน"
          isClearable
          className="basic-single"
          classNamePrefix="select"
          noOptionsMessage={() => 'ไม่พบวัคซีน'}
           styles={customSelectStyles}
        />
      </div>

      {/* ปุ่ม */}
      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-[#30266D] rounded shadow"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#30266D] hover:bg-[#221c59] text-white rounded shadow"
        >
          บันทึก
        </button>
      </div>
    </form>
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

