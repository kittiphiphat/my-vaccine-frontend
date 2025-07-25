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

  // สร้าง options โดย disable วันที่ถูกใช้แล้ว
  const updatedDayOptions = dayOptions.map((day) => ({
    ...day,
    isDisabled: usedDays.has(day.value),
  }));

  useEffect(() => {
  async function fetchVaccines() {
    try {
      // ดึงวัคซีนทั้งหมดที่ใช้ time slot
      const vaccineRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1&filters[useTimeSlots][$eq]=true`,
        { credentials: 'include' }
      );
      const vaccineJson = await vaccineRes.json();
      const allVaccines = vaccineJson.data;

      // ดึง vaccine-service-days ทั้งหมด
      const dayRes = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?pagination[limit]=-1&populate=vaccine`,
        { credentials: 'include' }
      );
      const dayJson = await dayRes.json();
      const usedVaccineIds = new Set(
        dayJson.data.map((d) => d.attributes.vaccine?.data?.id)
      );

      // กรองเฉพาะวัคซีนที่ยังไม่ถูกใช้
      const available = allVaccines.filter((v) => !usedVaccineIds.has(v.id));
      const options = available.map((v) => ({
        value: v.id,
        label: v.attributes?.title || `วัคซีน ID: ${v.id}`,
      }));

      setVaccines(options);
    } catch (err) {
      console.error('โหลดวัคซีนล้มเหลว:', err);
      MySwal.fire('ผิดพลาด', 'โหลดวัคซีนล้มเหลว', 'error');
    }
  }

  fetchVaccines();
}, []);


  // เมื่อเลือกวัคซีน ให้โหลด usedDays ใหม่
  useEffect(() => {
    async function fetchUsedDays() {
      if (!selectedVaccine) return;

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?filters[vaccine][id][$eq]=${selectedVaccine.value}&pagination[limit]=-1`,
          { credentials: 'include' }
        );
        const json = await res.json();
        const existing = json.data || [];

        const used = new Set();
        existing.forEach((item) => {
          const days = item.attributes.day_of_week || [];
          days.forEach((d) => used.add(d));
        });

        setUsedDays(used);
        // ล้าง selected days ถ้ามีวันที่ถูก disable
        setSelectedDays((prev) => prev.filter((d) => !used.has(d.value)));
      } catch (err) {
        console.error('โหลดวันซ้ำล้มเหลว:', err);
        MySwal.fire('ผิดพลาด', 'โหลดวันซ้ำล้มเหลว', 'error');
      }
    }

    fetchUsedDays();
  }, [selectedVaccine]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedDays.length) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวันให้บริการ', 'warning');
      return;
    }

    if (!selectedVaccine) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวัคซีน', 'warning');
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้างวันให้บริการ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
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
        throw new Error(msg);
      }

      await MySwal.fire('สำเร็จ', 'เพิ่มวันให้บริการเรียบร้อยแล้ว', 'success');
      onSave();
    } catch (err) {
      console.error('เกิดข้อผิดพลาด:', err);
      await MySwal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-xl font-semibold text-[#30266D]">สร้างวันให้บริการใหม่</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 text-[#30266D]">เลือกวันในสัปดาห์</label>
          <Select
            options={updatedDayOptions}
            isMulti
            value={selectedDays}
            onChange={setSelectedDays}
            placeholder="เลือกวัน..."
            styles={selectStyles}
          />
        </div>
        <div>
          <label className="block mb-1 text-[#30266D]">เลือกวัคซีน</label>
          <Select
            options={vaccines}
            value={selectedVaccine}
            onChange={setSelectedVaccine}
            placeholder="เลือกวัคซีน..."
            styles={selectStyles}
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-300 text-[#30266D] px-4 py-2 rounded-md"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            className="bg-[#30266D] text-white px-4 py-2 rounded-md"
          >
            บันทึก
          </button>
        </div>
      </form>
    </div>
  );
}

const selectStyles = {
  control: (base) => ({
    ...base,
    backgroundColor: '#30266D',
    borderColor: '#30266D',
    color: 'white',
  }),
  menu: (base) => ({
    ...base,
    backgroundColor: '#30266D',
    color: 'white',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isDisabled
      ? '#555' // สีเทาถ้า disabled
      : state.isFocused
      ? '#F9669D'
      : '#30266D',
    color: 'white',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    opacity: state.isDisabled ? 0.5 : 1,
  }),
  multiValue: (base) => ({
    ...base,
    backgroundColor: '#F9669D',
    color: 'white',
  }),
  multiValueLabel: (base) => ({
    ...base,
    color: 'white',
  }),
  multiValueRemove: (base) => ({
    ...base,
    color: 'white',
    ':hover': {
      backgroundColor: '#221c59',
      color: 'white',
    },
    cursor: 'pointer',
  }),
  placeholder: (base) => ({
    ...base,
    color: '#ccc',
  }),
  singleValue: (base) => ({
    ...base,
    color: 'white',
  }),
};
