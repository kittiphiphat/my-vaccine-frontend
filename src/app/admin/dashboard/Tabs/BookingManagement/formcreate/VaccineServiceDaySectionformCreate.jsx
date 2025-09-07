'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function VaccineServiceDayFormCreate({ onSave, onCancel }) {
  const [selectedDays, setSelectedDays] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState(null);
  const [vaccines, setVaccines] = useState([]);
  const [usedDays, setUsedDays] = useState(new Set());

  const dayOptions = [
    { value: 0, label: 'อาทิตย์' },
    { value: 1, label: 'จันทร์' },
    { value: 2, label: 'อังคาร' },
    { value: 3, label: 'พุธ' },
    { value: 4, label: 'พฤหัสบดี' },
    { value: 5, label: 'ศุกร์' },
    { value: 6, label: 'เสาร์' },
  ];

  const updatedDayOptions = dayOptions.map((day) => ({
    ...day,
    isDisabled: usedDays.has(day.value),
  }));

  useEffect(() => {
    async function fetchVaccines() {
      try {
        const vaccineRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`,
          { credentials: 'include' }
        );
        if (!vaccineRes.ok) throw new Error('ไม่สามารถโหลดข้อมูลวัคซีนได้');
        const vaccineJson = await vaccineRes.json();
        const allVaccines = vaccineJson.data || [];

        const dayRes = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?pagination[limit]=-1&populate=vaccine`,
          { credentials: 'include' }
        );
        if (!dayRes.ok) throw new Error('ไม่สามารถโหลดข้อมูลวันให้บริการได้');
        const dayJson = await dayRes.json();

        const usedVaccineIds = new Set(
          dayJson.data.map((d) => d.attributes.vaccine?.data?.id).filter(Boolean)
        );

        const available = allVaccines.filter((v) => !usedVaccineIds.has(v.id));

        const options = available.map((v) => ({
          value: v.id,
          label: v.attributes?.title || `วัคซีน ID: ${v.id}`,
        }));

        setVaccines(options);
      } catch (err) {
        MySwal.fire({
          title: 'ผิดพลาด',
          text: `โหลดข้อมูลวัคซีนล้มเหลว: ${err.message}`,
          icon: 'error',
          customClass: {
            popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
          },
        });
      }
    }

    fetchVaccines();
  }, []);

  useEffect(() => {
    async function fetchUsedDays() {
      if (!selectedVaccine) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?filters[vaccine][id][$eq]=${selectedVaccine.value}&pagination[limit]=-1`,
          { credentials: 'include' }
        );
        if (!res.ok) throw new Error('ไม่สามารถโหลดข้อมูลวันซ้ำได้');
        const json = await res.json();
        const existing = json.data || [];

        const used = new Set();
        existing.forEach((item) => {
          const days = item.attributes.day_of_week || [];
          days.forEach((d) => used.add(d));
        });

        setUsedDays(used);
        setSelectedDays((prev) => prev.filter((d) => !used.has(d.value)));
      } catch (err) {
        MySwal.fire({
          title: 'ผิดพลาด',
          text: `โหลดวันซ้ำล้มเหลว: ${err.message}`,
          icon: 'error',
          customClass: {
            popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
            title: 'text-xl font-bold text-[#30266D] mb-3',
            htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
          },
        });
      }
    }

    fetchUsedDays();
  }, [selectedVaccine]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDays.length) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวันให้บริการ',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
        },
      });
      return;
    }

    if (!selectedVaccine) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณาเลือกวัคซีน',
        icon: 'warning',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
        },
      });
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้างวันให้บริการ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
        title: 'text-xl font-bold text-[#30266D] mb-3',
        htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
        cancelButton: 'bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold text-base hover:bg-gray-400 transition-all duration-300 hover:scale-105',
      },
    });

    if (!confirm.isConfirmed) return;

    try {
      const payload = {
        data: {
          day_of_week: selectedDays.map((d) => d.value),
          vaccine: selectedVaccine.value,
        },
      };

      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'ไม่สามารถบันทึกวันให้บริการได้');
      }

      await MySwal.fire({
        title: 'สำเร็จ',
        text: 'เพิ่มวันให้บริการเรียบร้อยแล้ว',
        icon: 'success',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
        },
      });
      onSave();
    } catch (err) {
      await MySwal.fire({
        title: 'เกิดข้อผิดพลาด',
        text: `ไม่สามารถบันทึกวันให้บริการได้: ${err.message}`,
        icon: 'error',
        customClass: {
          popup: 'bg-white rounded-2xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-[#30266D] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold text-base hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105',
        },
      });
    }
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto p-4">
      <h2 className="text-xl font-semibold text-[#30266D]">สร้างวันให้บริการใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">เลือกวัคซีน</label>
          <Select
            options={vaccines}
            value={selectedVaccine}
            onChange={setSelectedVaccine}
            placeholder="เลือกวัคซีน..."
            classNamePrefix="react-select"
            noOptionsMessage={() => 'ไม่พบวัคซีน'}
            className="text-base"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: 'white',
                borderColor: '#30266D',
                boxShadow: 'none',
                '&:hover': { borderColor: '#F9669D' },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'white',
                border: '1px solid #30266D',
                borderRadius: '0.75rem',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isDisabled ? '#D1D5DB' : state.isFocused ? '#F9669D' : 'white',
                color: state.isDisabled ? '#6B7280' : state.isFocused ? 'white' : '#30266D',
                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                opacity: state.isDisabled ? 0.5 : 1,
                '&:active': { backgroundColor: '#F9669D', color: 'white' },
              }),
              multiValue: (base) => ({ ...base, backgroundColor: '#F9669D', color: 'white' }),
              multiValueLabel: (base) => ({ ...base, color: 'white' }),
              multiValueRemove: (base) => ({
                ...base,
                color: 'white',
                ':hover': { backgroundColor: '#221c59', color: 'white' },
                cursor: 'pointer',
              }),
              placeholder: (base) => ({ ...base, color: '#9CA3AF' }),
              singleValue: (base) => ({ ...base, color: '#30266D' }),
            }}
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">เลือกวันในสัปดาห์</label>
          <Select
            options={updatedDayOptions}
            isMulti
            value={selectedDays}
            onChange={setSelectedDays}
            placeholder="เลือกวัน..."
            classNamePrefix="react-select"
            className="text-base"
            styles={{
              control: (base) => ({
                ...base,
                backgroundColor: 'white',
                borderColor: '#30266D',
                boxShadow: 'none',
                '&:hover': { borderColor: '#F9669D' },
              }),
              menu: (base) => ({
                ...base,
                backgroundColor: 'white',
                border: '1px solid #30266D',
                borderRadius: '0.75rem',
              }),
              option: (base, state) => ({
                ...base,
                backgroundColor: state.isDisabled ? '#D1D5DB' : state.isFocused ? '#F9669D' : 'white',
                color: state.isDisabled ? '#6B7280' : state.isFocused ? 'white' : '#30266D',
                cursor: state.isDisabled ? 'not-allowed' : 'pointer',
                opacity: state.isDisabled ? 0.5 : 1,
                '&:active': { backgroundColor: '#F9669D', color: 'white' },
              }),
              multiValue: (base) => ({ ...base, backgroundColor: '#F9669D', color: 'white' }),
              multiValueLabel: (base) => ({ ...base, color: 'white' }),
              multiValueRemove: (base) => ({
                ...base,
                color: 'white',
                ':hover': { backgroundColor: '#221c59', color: 'white' },
                cursor: 'pointer',
              }),
              placeholder: (base) => ({ ...base, color: '#9CA3AF' }),
              singleValue: (base) => ({ ...base, color: '#30266D' }),
            }}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 hover:scale-105"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105"
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}