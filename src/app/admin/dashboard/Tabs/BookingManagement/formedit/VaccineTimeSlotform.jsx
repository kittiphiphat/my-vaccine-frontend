'use client';
import { useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// 🔧 ฟังก์ชันสร้าง options เวลา 06:00 - 22:00 ทุก 15 นาที
function generateTimeOptions(start = 6, end = 22, intervalMinutes = 15) {
  const times = [];
  for (let hour = start; hour <= end; hour++) {
    for (let min = 0; min < 60; min += intervalMinutes) {
      if (hour === end && min > 0) break;
      const hh = String(hour).padStart(2, '0');
      const mm = String(min).padStart(2, '0');
      times.push({ value: `${hh}:${mm}`, label: `${hh}:${mm}` });
    }
  }
  return times;
}
const timeOptions = generateTimeOptions();

export default function VaccineTimeSlotForm({ initialData = {}, onSave, onCancel }) {
  const [startTime, setStartTime] = useState(
    timeOptions.find((t) => t.value === initialData.startTime?.slice(0, 5)) || null
  );
  const [endTime, setEndTime] = useState(
    timeOptions.find((t) => t.value === initialData.endTime?.slice(0, 5)) || null
  );
  const [quota, setQuota] = useState(initialData.quota || 0);
  const [isEnabled, setIsEnabled] = useState(initialData.is_enabled ?? true);
  const [vaccineName] = useState(initialData.vaccine?.data?.attributes?.title || '');

  function formatTimeToStrapi(time) {
    if (!time?.value) return null;
    return `${time.value}:00.000`;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!startTime || !endTime) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกเวลาเริ่มและเวลาสิ้นสุด', 'warning');
      return;
    }

    if (startTime.value >= endTime.value) {
      await MySwal.fire('แจ้งเตือน', 'เวลาเริ่มต้นต้องน้อยกว่าเวลาสิ้นสุด', 'warning');
      return;
    }

    const confirm = await MySwal.fire({
      title: initialData?.id ? 'ยืนยันการแก้ไข' : 'ยืนยันการเพิ่มข้อมูล',
      text: 'คุณต้องการดำเนินการต่อหรือไม่?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ดำเนินการ',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    const payload = {
      data: {
        startTime: formatTimeToStrapi(startTime),
        endTime: formatTimeToStrapi(endTime),
        quota,
        is_enabled: isEnabled,
        vaccine: initialData?.vaccine?.data?.id,
      },
    };

    try {
      const url = initialData?.id
        ? `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots/${initialData.id}`
        : `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots`;
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log('📦 Response:', result);

      if (!res.ok) throw new Error(result.error?.message || 'เกิดข้อผิดพลาด');

      MySwal.fire('สำเร็จ', 'ข้อมูลถูกบันทึกแล้ว', 'success');
      onSave();
    } catch (error) {
      console.error('❌ Error saving time slot:', error);
      MySwal.fire('เกิดข้อผิดพลาด', error.message, 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {vaccineName && (
        <div>
          <label className="block mb-1">ชื่อวัคซีน</label>
          <input
            type="text"
            value={vaccineName}
            readOnly
            className="w-full border px-3 py-2 rounded-md bg-gray-100"
          />
        </div>
      )}

      <div>
        <label className="block mb-1">เวลาเริ่ม</label>
        <Select
          options={timeOptions}
          value={startTime}
          onChange={setStartTime}
          placeholder="-- เลือกเวลาเริ่ม --"
          isClearable
          styles={customSelectStyles}
        />
      </div>

      <div>
        <label className="block mb-1">เวลาสิ้นสุด</label>
        <Select
          options={timeOptions}
          value={endTime}
          onChange={setEndTime}
          placeholder="-- เลือกเวลาสิ้นสุด --"
          isClearable
          styles={customSelectStyles}
        />
      </div>

      <div>
        <label className="block mb-1">จำนวนโควต้า</label>
        <input
          type="number"
          min={1}
          value={quota}
          onChange={(e) => setQuota(Number(e.target.value))}
          className="w-full border px-3 py-2 rounded-md"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => setIsEnabled(e.target.checked)}
        />
        <label>เปิดใช้งาน</label>
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded bg-gray-200"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 rounded bg-[#30266D] text-white"
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


