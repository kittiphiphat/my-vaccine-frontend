'use client';

import { useEffect, useState } from 'react';
import Select from 'react-select';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

const colors = {
  primary: '#F9669D',
  secondary: '#1C1447',
  text: '#1C1447',
  error: '#F9669D',
  detailsText: '#1C1447',
  bg: '#FFFFFF',
  border: '#1C1447',
  accent: '#F9669D'
};

const customSelectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderColor: colors.border,
    boxShadow: 'none',
    color: colors.text,
    borderRadius: '0.75rem',
    padding: '0.25rem',
    backdropFilter: 'blur(8px)',
    '&:hover': {
      borderColor: colors.primary,
      transform: 'scale(1.02)',
      transition: 'all 0.3s ease',
    },
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(8px)',
    border: `1px solid ${colors.border}`,
    borderRadius: '0.75rem',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isFocused ? colors.primary : 'transparent',
    color: state.isFocused ? 'white' : colors.text,
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: colors.primary,
      color: 'white',
    },
  }),
  singleValue: (base) => ({
    ...base,
    color: colors.text,
  }),
  placeholder: (base) => ({
    ...base,
    color: colors.detailsText,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: colors.accent,
    color: 'white',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'white',
    cursor: 'pointer',
    '&:hover': {
      backgroundColor: colors.error,
    },
  }),
};

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
            popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#1C1447]/50 p-6',
            title: 'text-lg font-bold text-[#1C1447] mb-3',
            htmlContainer: 'text-sm text-[#1C1447] font-medium mb-4',
            confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
          },
          confirmButtonText: 'ตกลง',
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
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#1C1447]/50 p-6',
          title: 'text-lg font-bold text-[#1C1447] mb-3',
          htmlContainer: 'text-sm text-[#1C1447] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
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
          popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#1C1447]/50 p-6',
          title: 'text-lg font-bold text-[#1C1447] mb-3',
          htmlContainer: 'text-sm text-[#1C1447] font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
        confirmButtonText: 'ตกลง',
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
        popup: 'bg-white/90 backdrop-blur-lg rounded-2xl shadow-lg border border-[#1C1447]/50 p-6',
        title: 'text-lg font-bold text-[#1C1447] mb-3',
        htmlContainer: 'text-sm text-[#1C1447] font-medium mb-4',
        confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        cancelButton: 'bg-white text-[#1C1447] px-4 py-2 rounded-xl font-semibold border border-[#1C1447] hover:bg-[#1C1447]/30 transition-all',
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
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-xl font-bold text-[#1C1447]">สร้างการจองล่วงหน้าใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-5 font-poppins">
        <div>
          <label className="block mb-1 text-sm font-medium text-[#1C1447]" htmlFor="vaccine-select">วัคซีน</label>
          <Select
            id="vaccine-select"
            options={vaccineOptions}
            value={vaccine}
            onChange={setVaccine}
            placeholder="-- เลือกวัคซีน --"
            noOptionsMessage={() => 'ไม่มีวัคซีนให้เลือก'}
            isClearable
            styles={customSelectStyles}
            aria-label="เลือกวัคซีนสำหรับการจองล่วงหน้า"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-[#1C1447]" htmlFor="advance-booking-days">จองล่วงหน้า (วัน)</label>
          <input
            id="advance-booking-days"
            type="number"
            min={0}
            value={advance_booking_days}
            onChange={(e) => setAdvanceBookingDays(Number(e.target.value))}
            className="w-full border border-[#1C1447]/50 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-sm text-[#1C1447] focus:outline-none focus:ring-2 focus:ring-[#F9669D] transition-all duration-300 hover:scale-[1.02]"
            aria-label="จำนวนวันจองล่วงหน้า"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-[#1C1447]" htmlFor="prevent-last-minute">เวลากั้นการจอง (นาที)</label>
          <input
            id="prevent-last-minute"
            type="number"
            min={0}
            value={prevent_last_minute_minutes}
            onChange={(e) => setPreventLastMinute(Number(e.target.value))}
            className="w-full border border-[#1C1447]/50 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-sm text-[#1C1447] focus:outline-none focus:ring-2 focus:ring-[#F9669D] transition-all duration-300 hover:scale-[1.02]"
            aria-label="จำนวนนาทีกั้นการจองล่วงหน้า"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-[#1C1447]" htmlFor="slot-duration">ช่วงเวลา (นาที)</label>
          <input
            id="slot-duration"
            type="number"
            min={1}
            value={slotDurationMinutes}
            onChange={(e) => setSlotDurationMinutes(Number(e.target.value))}
            className="w-full border border-[#1C1447]/50 px-3 py-2 rounded-xl bg-white/80 backdrop-blur-sm text-sm text-[#1C1447] focus:outline-none focus:ring-2 focus:ring-[#F9669D] transition-all duration-300 hover:scale-[1.02]"
            aria-label="ระยะเวลาช่วงการจอง (นาที)"
          />
        </div>

        <div>
          <label className="block mb-1 text-sm font-medium text-[#1C1447]" htmlFor="is-enabled">สถานะ</label>
          <Select
            id="is-enabled"
            options={[
              { value: true, label: 'เปิดใช้งาน' },
              { value: false, label: 'ปิด' },
            ]}
            value={{ value: is_enabled, label: is_enabled ? 'เปิดใช้งาน' : 'ปิด' }}
            onChange={(opt) => setIsEnabled(opt.value)}
            styles={customSelectStyles}
            aria-label="สถานะการจองล่วงหน้า"
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-white text-[#1C1447] border border-[#1C1447] text-sm font-semibold hover:bg-[#1C1447]/30 transition-all duration-300 hover:scale-105"
            aria-label="ยกเลิกการสร้างการจองล่วงหน้า"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-[#F9669D] text-white text-sm font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 hover:scale-105"
            aria-label="บันทึกการจองล่วงหน้า"
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}