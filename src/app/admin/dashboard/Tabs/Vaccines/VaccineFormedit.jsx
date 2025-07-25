'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import dayjs from 'dayjs';

const MySwal = withReactContent(Swal);

export default function VaccineFormedit({ vaccine = {}, onSave, onCancel }) {
  function formatTimeToHHmm(timeStr) {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    if (parts.length >= 2) {
      return parts[0].padStart(2, '0') + ':' + parts[1].padStart(2, '0');
    }
    return '';
  }

  function toFullTimeFormat(timeStr) {
    if (!timeStr) return null;
    if (/^\d{2}:\d{2}$/.test(timeStr)) {
      return `${timeStr}:00.000`;
    }
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
      return `${timeStr}.000`;
    }
    return null;
  }

  function generateTimeOptions(start = 6, end = 22, intervalMinutes = 15) {
    const times = [];
    for (let hour = start; hour <= end; hour++) {
      for (let min = 0; min < 60; min += intervalMinutes) {
        if (hour === end && min > 0) break;
        const hh = String(hour).padStart(2, '0');
        const mm = String(min).padStart(2, '0');
        const label = `${hh}:${mm}`;
        times.push({ value: label, label });
      }
    }
    return times;
  }

  const timeOptions = generateTimeOptions();

  function extractDateOnly(dateStr) {
    if (!dateStr) return '';
    return dateStr.split('T')[0];
  }

  const genderOptions = [
    { value: 'any', label: 'ทุกเพศ' },
    { value: 'male', label: 'ชาย' },
    { value: 'female', label: 'หญิง' },
  ];

  const [title, setTitle] = useState(vaccine.title || '');
  const [description, setDescription] = useState(vaccine.description || '');
  const [gender, setGender] = useState(genderOptions.find(g => g.value === (vaccine.gender || 'any')));
  const [minAge, setMinAge] = useState(vaccine.minAge ?? 0);
  const [maxAge, setMaxAge] = useState(vaccine.maxAge ?? 100);
  const [bookingStartDate, setBookingStartDate] = useState(extractDateOnly(vaccine.bookingStartDate));
  const [bookingEndDate, setBookingEndDate] = useState(extractDateOnly(vaccine.bookingEndDate));
  const [maxQuota, setMaxQuota] = useState(vaccine.maxQuota ?? 0);
  const [useTimeSlots, setUseTimeSlots] = useState(vaccine.useTimeSlots || false);

  const defaultStartTime = formatTimeToHHmm(vaccine.serviceStartTime) || '06:00';
  const defaultEndTime = formatTimeToHHmm(vaccine.serviceEndTime) || '22:00';

  const [serviceStartTime, setServiceStartTime] = useState({ value: defaultStartTime, label: defaultStartTime });
  const [serviceEndTime, setServiceEndTime] = useState({ value: defaultEndTime, label: defaultEndTime });
  const [submitting, setSubmitting] = useState(false);

  const isEdit = !!vaccine.id;

  useEffect(() => {
    setServiceStartTime({ value: formatTimeToHHmm(vaccine.serviceStartTime) || '06:00', label: formatTimeToHHmm(vaccine.serviceStartTime) || '06:00' });
    setServiceEndTime({ value: formatTimeToHHmm(vaccine.serviceEndTime) || '22:00', label: formatTimeToHHmm(vaccine.serviceEndTime) || '22:00' });
  }, [vaccine]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      await MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกชื่อวัคซีน' });
      return;
    }
    if (minAge < 0 || maxAge < minAge) {
      await MySwal.fire({ icon: 'warning', title: 'ช่วงอายุไม่ถูกต้อง', text: 'กรุณาตรวจสอบช่วงอายุที่กรอก' });
      return;
    }
    if (!bookingStartDate || !bookingEndDate) {
      await MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกช่วงเวลาการจอง' });
      return;
    }
    if (!maxQuota || maxQuota <= 0) {
      await MySwal.fire({ icon: 'warning', title: 'ข้อมูลไม่ครบถ้วน', text: 'กรุณากรอกจำนวนสูงสุดที่รับได้' });
      return;
    }
    if (dayjs(serviceEndTime.value, 'HH:mm').isBefore(dayjs(serviceStartTime.value, 'HH:mm'))) {
      await MySwal.fire({ icon: 'warning', title: 'เวลาบริการไม่ถูกต้อง', text: 'เวลาสิ้นสุดต้องไม่ก่อนเวลาเริ่มต้น' });
      return;
    }

    const result = await MySwal.fire({
      title: 'ยืนยันการบันทึก',
      text: 'คุณต้องการบันทึกข้อมูลวัคซีนนี้หรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);

    try {
      const payload = {
        data: {
          title,
          description,
          gender: gender.value,
          minAge,
          maxAge,
          bookingStartDate,
          bookingEndDate,
          maxQuota,
          useTimeSlots,
          serviceStartTime: toFullTimeFormat(serviceStartTime.value),
          serviceEndTime: toFullTimeFormat(serviceEndTime.value),
        },
      };

      const url = isEdit
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines/${vaccine.id}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`;

      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error('เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + errorText);
      }

      const resData = await res.json();
      console.log('Response from API:', resData);

      if (!resData?.data?.id) {
        throw new Error('Response จาก API ไม่มีข้อมูล id');
      }

      await MySwal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', text: 'ข้อมูลวัคซีนถูกบันทึกเรียบร้อยแล้ว' });

      onSave({ id: resData.data.id, attributes: resData.data.attributes });
    } catch (error) {
      await MySwal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: error.message || 'ไม่สามารถบันทึกข้อมูลได้' });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-[#FAF9FE] p-6 rounded-md shadow-md border border-[#30266D]">
      <h3 className="text-xl font-semibold text-[#30266D]">{isEdit ? 'แก้ไขวัคซีน' : 'เพิ่มวัคซีนใหม่'}</h3>

      <div>
        <label className="block font-semibold text-[#30266D] mb-1">ชื่อวัคซีน *</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
      </div>

      <div>
        <label className="block font-semibold text-[#30266D] mb-1">คำอธิบาย</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">เพศ</label>
          <Select value={gender} onChange={setGender} options={genderOptions} className="react-select-container" classNamePrefix="react-select" styles={customSelectStyles} />
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">ช่วงอายุต่ำสุด (ปี)</label>
          <input type="number" value={minAge} onChange={(e) => setMinAge(Number(e.target.value))} min={0} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">ช่วงอายุสูงสุด (ปี)</label>
          <input type="number" value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} min={minAge} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">วันที่เริ่มเปิดจอง *</label>
          <input type="date" value={bookingStartDate} onChange={(e) => setBookingStartDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">วันที่ปิดจอง *</label>
          <input type="date" value={bookingEndDate} onChange={(e) => setBookingEndDate(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2" />
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">เวลาให้บริการ (เริ่ม)</label>
          <Select value={serviceStartTime} onChange={setServiceStartTime} options={timeOptions} className="react-select-container" classNamePrefix="react-select"  styles={customSelectStyles}/>
        </div>

        <div className="flex-1">
          <label className="block font-semibold text-[#30266D] mb-1">เวลาให้บริการ (สิ้นสุด)</label>
          <Select value={serviceEndTime} onChange={setServiceEndTime} options={timeOptions} className="react-select-container" classNamePrefix="react-select" styles={customSelectStyles} />
        </div>
      </div>

      <div>
        <label className="block font-semibold text-[#30266D] mb-1">จำนวนสูงสุด *</label>
        <input type="number" value={maxQuota} onChange={(e) => setMaxQuota(Number(e.target.value))} min={1} className="w-full border border-gray-300 rounded-md px-3 py-2" />
      </div>

      <div className="flex items-center gap-4">
        <input type="checkbox" id="useTimeSlots" checked={useTimeSlots} onChange={() => setUseTimeSlots(!useTimeSlots)} className="w-4 h-4 text-[#F9669D]" />
        <label htmlFor="useTimeSlots" className="font-semibold text-[#30266D] select-none">ใช้ระบบช่วงเวลาการให้บริการ</label>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button type="button" onClick={onCancel} disabled={submitting} className="px-4 py-2 rounded-md border border-[#30266D] text-[#30266D] hover:bg-[#30266D] hover:text-white transition">ยกเลิก</button>
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-md bg-[#30266D] text-white hover:bg-[#251f5a] transition">{submitting ? 'กำลังบันทึก...' : 'บันทึก'}</button>
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
