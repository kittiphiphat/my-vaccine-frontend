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
    async function fetchData() {
      try {
        const vaccinesRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`, {
          credentials: 'include',
        });
        if (!vaccinesRes.ok) throw new Error('Failed to fetch vaccines');
        const vaccinesData = await vaccinesRes.json();
        const allVaccines = vaccinesData.data || [];

        const bookingSettingsRes = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/booking-settings?pagination[limit]=-1&populate=vaccine`, {
          credentials: 'include',
        });
        if (!bookingSettingsRes.ok) throw new Error('Failed to fetch booking settings');
        const bookingSettingsData = await bookingSettingsRes.json();
        const bookingSettings = bookingSettingsData.data || [];

        const usedVaccineIds = bookingSettings
          .map(bs => bs.attributes.vaccine?.data?.id)
          .filter(id => id !== undefined);

        const filteredVaccines = allVaccines.filter(v => !usedVaccineIds.includes(v.id));

        setVaccines(filteredVaccines);
      } catch (error) {
        MySwal.fire({
          title: 'ผิดพลาด',
          text: 'โหลดข้อมูลวัคซีนล้มเหลว: ' + error.message,
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

    fetchData();
  }, []);

  const vaccineOptions = vaccines.map((v) => ({
    value: v.id,
    label: v.attributes.title,
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vaccine) {
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

    if (
      advance_booking_days < 0 ||
      prevent_last_minute_minutes < 0 ||
      slotDurationMinutes <= 0
    ) {
      await MySwal.fire({
        title: 'แจ้งเตือน',
        text: 'กรุณากรอกตัวเลขให้ถูกต้อง',
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
      title: 'ยืนยันการบันทึก?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่',
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

    onSave({
      advance_booking_days,
      prevent_last_minute_minutes,
      slotDurationMinutes,
      is_enabled,
      vaccine: vaccine.value,
    });
  };

  return (
    <div className="space-y-4 max-w-md mx-auto p-4">
      <h2 className="text-xl font-semibold text-[#30266D]">สร้างการจองล่วงหน้าใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">วัคซีน</label>
          <Select
            options={vaccineOptions}
            value={vaccine}
            onChange={setVaccine}
            placeholder="-- เลือกวัคซีน --"
            noOptionsMessage={() => 'ไม่มีวัคซีนให้เลือก'}
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
                backgroundColor: state.isFocused ? '#F9669D' : 'white',
                color: state.isFocused ? 'white' : '#30266D',
                '&:active': { backgroundColor: '#F9669D', color: 'white' },
              }),
              singleValue: (base) => ({ ...base, color: '#30266D' }),
              placeholder: (base) => ({ ...base, color: '#9CA3AF' }),
            }}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">จองล่วงหน้า (วัน)</label>
          <input
            type="number"
            className="w-full border border-[#30266D] rounded-xl px-3 py-2 text-[#30266D] focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
            value={advance_booking_days}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">เวลากั้นการจอง (นาที)</label>
          <input
            type="number"
            className="w-full border border-[#30266D] rounded-xl px-3 py-2 text-[#30266D] focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
            value={prevent_last_minute_minutes}
            onChange={(e) => setPreventLastMinute(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">ช่วงเวลา (นาที)</label>
          <input
            type="number"
            className="w-full border border-[#30266D] rounded-xl px-3 py-2 text-[#30266D] focus:outline-none focus:ring-2 focus:ring-[#F9669D]"
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="block mb-1 font-semibold text-[#30266D]">สถานะ</label>
          <Select
            options={[
              { value: true, label: 'เปิดใช้งาน' },
              { value: false, label: 'ปิด' },
            ]}
            value={{ value: is_enabled, label: is_enabled ? 'เปิดใช้งาน' : 'ปิด' }}
            onChange={(opt) => setIsEnabled(opt.value)}
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
                backgroundColor: state.isFocused ? '#F9669D' : 'white',
                color: state.isFocused ? 'white' : '#30266D',
                '&:active': { backgroundColor: '#F9669D', color: 'white' },
              }),
              singleValue: (base) => ({ ...base, color: '#30266D' }),
              placeholder: (base) => ({ ...base, color: '#9CA3AF' }),
            }}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="submit"
            className="bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#30266D]/80 transition-all duration-300 hover:scale-105"
          >
            บันทึก
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-[#30266D] px-4 py-2 rounded-xl font-semibold hover:bg-gray-400 transition-all duration-300 hover:scale-105"
          >
            ยกเลิก
          </button>
        </div>
      </form>
    </div>
  );
}