'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function BookingSettingFormCreate({ onSave, onCancel }) {
  const [advance_booking_days, setAdvanceBookingDays] = useState(1);
  const [prevent_last_minute_minutes, setPreventLastMinute] = useState(30);
  const [slotDurationMinutes, setSlotDurationMinutes] = useState(10);
  const [is_enabled, setIsEnabled] = useState(true);
  const [vaccine, setVaccine] = useState(null);
  const [vaccines, setVaccines] = useState([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines`)
      .then((res) => res.json())
      .then((data) => setVaccines(data.data || []))
      .catch((err) => {
        console.error('Error fetching vaccines', err);
        MySwal.fire('ผิดพลาด', 'โหลดข้อมูลวัคซีนล้มเหลว', 'error');
      });
  }, []);

  const vaccineOptions = vaccines.map((v) => ({
    value: v.id,
    label: v.attributes.title,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vaccine) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวัคซีน', 'warning');
      return;
    }

    if (
      advance_booking_days < 0 ||
      prevent_last_minute_minutes < 0 ||
      slotDurationMinutes <= 0
    ) {
      await MySwal.fire('แจ้งเตือน', 'กรุณากรอกตัวเลขให้ถูกต้อง', 'warning');
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการบันทึก?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    onSave({
      advance_booking_days,
      prevent_last_minute_minutes,
      slotDurationMinutes,
      is_enabled,
      vaccine: vaccine.value,
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-[#30266D]">สร้างการจองล่วงหน้าใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        {/* วัคซีน */}
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">วัคซีน</label>
          <Select
            options={vaccineOptions}
            value={vaccine}
            onChange={setVaccine}
            placeholder="-- เลือกวัคซีน --"
            isClearable
            styles={customSelectStyles}
          />
        </div>

        {/* วันล่วงหน้า */}
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">จองล่วงหน้า (วัน)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={advance_booking_days}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
          />
        </div>

        {/* เวลากั้นการจอง */}
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">เวลากั้นการจอง (นาที)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={prevent_last_minute_minutes}
            onChange={(e) => setPreventLastMinute(Number(e.target.value))}
          />
        </div>

        {/* ความยาวช่วงเวลา */}
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">ช่วงเวลา (นาที)</label>
          <input
            type="number"
            className="w-full border rounded px-3 py-2"
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
          />
        </div>

        {/* สถานะ */}
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">สถานะ</label>
          <Select
            options={[
              { value: true, label: 'เปิดใช้งาน' },
              { value: false, label: 'ปิด' },
            ]}
            value={{ value: is_enabled, label: is_enabled ? 'เปิดใช้งาน' : 'ปิด' }}
            onChange={(opt) => setIsEnabled(opt.value)}
            styles={customSelectStyles}
          />
        </div>

        {/* ปุ่ม */}
        <div className="flex space-x-2">
          <button type="submit" className="bg-[#30266D] text-white px-4 py-2 rounded-md">
            บันทึก
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-black px-4 py-2 rounded-md"
          >
            ยกเลิก
          </button>
        </div>
      </form>
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
