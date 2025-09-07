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
  const initialVaccineId =
    initialData.vaccine && initialData.vaccine.id ? String(initialData.vaccine.id) : '';

  const [days, setDays] = useState(initialData.day_of_week || []);
  const [selectedVaccineId, setSelectedVaccineId] = useState(initialVaccineId);
  const [vaccineOptions, setVaccineOptions] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`, {
      credentials: 'include',
    })
      .then((res) => {
        if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลวัคซีนได้');
        return res.json();
      })
      .then((data) => {
        const options = (data.data || []).map((v) => ({
          value: String(v.id),
          label: v.attributes?.title || `วัคซีน ID: ${v.id}`,
        }));
        setVaccineOptions(options);
      })
      .catch((error) => {
        MySwal.fire({
          title: 'ผิดพลาด',
          text: `โหลดข้อมูลวัคซีนล้มเหลว: ${error.message}`,
          icon: 'error',
          customClass: {
            popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
        });
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
      return MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวันให้บริการอย่างน้อย 1 วัน',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }

    if (!selectedVaccineId) {
      return MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีนอย่างน้อย 1 รายการ',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }

    const confirmResult = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold text-base hover:bg-gray-400 transition-all duration-300 transform hover:scale-105',
      },
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
          errorData?.error?.message || errorData?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        throw new Error(message);
      }

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'บันทึกข้อมูลเรียบร้อย',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      onSave();
    } catch (error) {
      await MySwal.fire({
        title: 'ผิดพลาด',
        text: `เกิดข้อผิดพลาดในการบันทึก: ${error.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-[#30266D] bg-gray-50 p-6 rounded-2xl shadow-lg space-y-6 max-w-xl mx-auto"
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
                className="accent-[#F9669D] h-4 w-4"
              />
              <span className="text-[#30266D]">{label}</span>
            </label>
          ))}
        </div>
      </div>


      <div>
        <label className="font-semibold text-[#30266D] block mb-2">เลือกวัคซีน *</label>
        <Select
          options={vaccineOptions}
          value={vaccineOptions.find((opt) => opt.value === selectedVaccineId) || null}
          onChange={(selected) => setSelectedVaccineId(selected ? selected.value : '')}
          placeholder="เลือกวัคซีน"
          isClearable
          className="text-base"
          classNamePrefix="react-select"
          noOptionsMessage={() => 'ไม่พบวัคซีน'}
          styles={{
            control: (base) => ({
              ...base,
              backgroundColor: 'white',
              borderColor: '#30266D',
              boxShadow: 'none',
              '&:hover': {
                borderColor: '#F9669D',
              },
            }),
            menu: (base) => ({
              ...base,
              backgroundColor: 'white',
              border: '1px solid #30266D',
              borderRadius: '0.75rem',
            }),
            option: (base, state) => ({
              ...base,
              backgroundColor: state.isFocused ? '#F9669D' : 'white',
              color: state.isFocused ? 'white' : '#30266D',
              cursor: 'pointer',
              '&:active': {
                backgroundColor: '#F9669D',
                color: 'white',
              },
            }),
            singleValue: (base) => ({
              ...base,
              color: '#30266D',
            }),
            placeholder: (base) => ({
              ...base,
              color: '#9CA3AF',
            }),
          }}
        />
      </div>


      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-300 text-[#30266D] rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 transform hover:scale-105"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-[#30266D] text-white rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 transform hover:scale-105"
        >
          บันทึก
        </button>
      </div>
    </form>
  );
}