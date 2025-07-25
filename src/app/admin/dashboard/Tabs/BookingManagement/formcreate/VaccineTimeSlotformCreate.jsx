'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

function generateTimeOptions(start = 6, end = 22, intervalMinutes = 15) {
  const times = [];
  for (let hour = start; hour <= end; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      if (hour === end && min > 0) break;
      const hh = String(hour).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      times.push(`${hh}:${mm}`);
    }
  }
  return times;
}

const timeOptions = generateTimeOptions().map((time) => ({
  value: time,
  label: time,
}));

export default function VaccineTimeSlotFormCreate({ onSave, onCancel }) {
  const [vaccineOptions, setVaccineOptions] = useState([]);
  const [vaccineId, setVaccineId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [quota, setQuota] = useState(1);
  const [isEnabled, setIsEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
  async function fetchVaccinesAndFilter() {
    try {
      const vaccinesRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1&filters[useTimeSlots][$eq]=true`, {
        credentials: 'include',
      });
      const vaccinesJson = await vaccinesRes.json();
      const allVaccines = vaccinesJson.data || [];


      const availableVaccines = allVaccines;

      const options = availableVaccines.map(vaccine => ({
        value: vaccine.id,
        label: vaccine.attributes?.title || `วัคซีน ID: ${vaccine.id}`,
      }));

      setVaccineOptions(options);
    } catch (error) {
      
      MySwal.fire('ผิดพลาด', 'โหลดข้อมูลวัคซีนล้มเหลว', 'error');
    }
  }

  fetchVaccinesAndFilter();
}, []);


  function toFullTimeFormat(timeStr) {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}:00.000`;
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) return `${timeStr}.000`;
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!vaccineId || !startTime || !endTime || startTime >= endTime || quota <= 0) {
      MySwal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ถูกต้อง', 'warning');
      return;
    }

    const confirmResult = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirmResult.isConfirmed) return;

    setSubmitting(true);

    const payload = {
      data: {
        vaccine: Number(vaccineId),
        startTime: toFullTimeFormat(startTime),
        endTime: toFullTimeFormat(endTime),
        quota,
        is_enabled: isEnabled,
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorJson = await res.json();
        throw new Error(errorJson?.error?.message || 'ไม่สามารถบันทึกข้อมูลได้');
      }

      await MySwal.fire('สำเร็จ', 'บันทึกช่วงเวลาเรียบร้อยแล้ว', 'success');
      onSave();
    } catch (error) {
      await MySwal.fire('ผิดพลาด', `${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#FAF9FE] p-6 rounded-md shadow-md border border-[#30266D]">
      <h3 className="text-xl font-semibold text-[#30266D]">สร้างช่วงเวลาให้บริการใหม่</h3>

      <div>
        <label className="block font-semibold text-[#30266D] mb-1">วัคซีน *</label>
        <Select
          options={vaccineOptions}
          value={vaccineOptions.find(opt => opt.value === vaccineId) || null}
          onChange={(selected) => setVaccineId(selected ? selected.value : '')}
          placeholder="-- เลือกวัคซีน --"
          isClearable
          noOptionsMessage={() => 'ไม่มีวัคซีนให้เลือก'}
          styles={customSelectStyles}
        />
      </div>

      {/* startTime & endTime */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">เวลาเริ่มต้น *</label>
          <Select
            options={timeOptions}
            value={timeOptions.find(opt => opt.value === startTime) || null}
            onChange={(selected) => setStartTime(selected ? selected.value : '')}
            placeholder="-- เลือกเวลา --"
            isClearable
            styles={customSelectStyles}
          />
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">เวลาสิ้นสุด *</label>
          <Select
            options={timeOptions}
            value={timeOptions.find(opt => opt.value === endTime) || null}
            onChange={(selected) => setEndTime(selected ? selected.value : '')}
            placeholder="-- เลือกเวลา --"
            isClearable
            styles={customSelectStyles}
          />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-[#30266D] mb-1">จำนวนที่รับ *</label>
        <input
          type="number"
          min={1}
          value={quota}
          onChange={(e) => setQuota(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-md px-3 py-2"
        />
      </div>

      <div className="flex items-center gap-4">
        <input
          type="checkbox"
          id="isEnabled"
          checked={isEnabled}
          onChange={() => setIsEnabled(!isEnabled)}
          className="w-4 h-4 text-[#F9669D]"
        />
        <label htmlFor="isEnabled" className="font-semibold text-[#30266D] select-none">
          เปิดใช้งาน
        </label>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="px-4 py-2 rounded-md border border-[#30266D] text-[#30266D] hover:bg-[#30266D] hover:text-white transition"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-md bg-[#30266D] text-white hover:bg-[#251f5a] transition"
        >
          {submitting ? 'กำลังบันทึก...' : 'บันทึก'}
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
