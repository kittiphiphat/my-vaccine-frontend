'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function BookingSettingForm({ initialData = {}, onSave, onCancel }) {
  const [advanceBookingDays, setAdvanceBookingDays] = useState(initialData.advance_booking_days ?? 0);
  const [preventLastMinuteMinutes, setPreventLastMinuteMinutes] = useState(initialData.prevent_last_minute_minutes ?? 0);
 
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(initialData.slot_duration_minutes ?? 30);
  const [isEnabled, setIsEnabled] = useState(initialData.is_enabled ?? true);

  const vaccineTitle = initialData.vaccine?.data?.attributes?.title || '';

  useEffect(() => {
    setAdvanceBookingDays(initialData.advance_booking_days ?? 0);
    setPreventLastMinuteMinutes(initialData.prevent_last_minute_minutes ?? 0);
    setSlotDurationMinutes(initialData.slot_duration_minutes ?? 30);
    setIsEnabled(initialData.is_enabled ?? true);
  }, [initialData]);

  function handleNumberChange(setter) {
    return (e) => {
      const val = e.target.value;
      // ถ้าว่าง ให้เก็บ 0
      if (val === '') {
        setter(0);
        return;
      }
      const num = parseInt(val, 10);
      if (!isNaN(num) && num >= 0) {
        setter(num);
      }
    };
  }

 async function handleSubmit(e) {
  e.preventDefault();

  const result = await MySwal.fire({
    title: 'ยืนยันการบันทึก',
    text: 'คุณต้องการบันทึกการตั้งค่านี้หรือไม่?',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'ใช่, บันทึก',
    cancelButtonText: 'ยกเลิก',
  });

  if (!result.isConfirmed) return;

  onSave({
    id: initialData.id,
    advance_booking_days: advanceBookingDays,
    prevent_last_minute_minutes: preventLastMinuteMinutes,
    slot_duration_minutes: slotDurationMinutes,
    is_enabled: isEnabled,
    vaccine: initialData.vaccine?.data?.id,
  });
}

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {vaccineTitle && (
        <div>
          <label className="block mb-1">ชื่อวัคซีน</label>
          <input
            type="text"
            value={vaccineTitle}
            readOnly
            className="w-full border px-3 py-2 rounded-md bg-gray-100"
          />
        </div>
      )}

      <div>
        <label className="block mb-1">จำนวนวันล่วงหน้าที่ให้จอง</label>
        <input
          type="number"
          min={0}
          value={advanceBookingDays}
          onChange={handleNumberChange(setAdvanceBookingDays)}
          className="w-full border px-3 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1">จำกัดการจองก่อนล่วงหน้า (นาที)</label>
        <input
          type="number"
          min={0}
          value={preventLastMinuteMinutes}
          onChange={handleNumberChange(setPreventLastMinuteMinutes)}
          className="w-full border px-3 py-2 rounded-md"
        />
      </div>

      <div>
        <label className="block mb-1">ระยะเวลา Slot (นาที)</label>
        <input
          type="number"
          min={0}
          value={slotDurationMinutes}
          onChange={handleNumberChange(setSlotDurationMinutes)}
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