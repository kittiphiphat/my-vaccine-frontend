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

  const dayOptions = [
    { value: 0, label: 'อาทิตย์' },
    { value: 1, label: 'จันทร์' },
    { value: 2, label: 'อังคาร' },
    { value: 3, label: 'พุธ' },
    { value: 4, label: 'พฤหัสบดี' },
    { value: 5, label: 'ศุกร์' },
    { value: 6, label: 'เสาร์' },
  ];

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccines?pagination[limit]=-1`)
      .then((res) => res.json())
      .then((data) => {
        const options = (data.data || []).map((vaccine) => ({
          value: vaccine.id,
          label: vaccine.attributes?.title || `วัคซีน ID: ${vaccine.id}`,
        }));
        setVaccines(options);
      })
      .catch((err) => {
        console.error('Error fetching vaccines:', err);
        MySwal.fire('ผิดพลาด', 'โหลดข้อมูลวัคซีนล้มเหลว', 'error');
      });
  }, []);

  const handleDaysChange = (selected) => {
    setSelectedDays(selected || []);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedDays.length === 0) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวันให้บริการอย่างน้อย 1 วัน', 'warning');
      return;
    }

    if (!selectedVaccine) {
      await MySwal.fire('แจ้งเตือน', 'กรุณาเลือกวัคซีน', 'warning');
      return;
    }

    const confirm = await MySwal.fire({
      title: 'ยืนยันการสร้างวันให้บริการ?',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการเพิ่มข้อมูลนี้',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'ใช่, บันทึก',
      cancelButtonText: 'ยกเลิก',
    });

    if (!confirm.isConfirmed) return;

    const payload = {
      data: {
        day_of_week: selectedDays.map((d) => d.value),
        vaccine: selectedVaccine.value,
      },
    };

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Create failed');
      await MySwal.fire('สำเร็จ', 'บันทึกวันให้บริการเรียบร้อยแล้ว', 'success');
      onSave();
    } catch (err) {
      console.error('Error creating service day:', err);
      await MySwal.fire('ผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <h2 className="text-xl font-semibold text-[#30266D]">สร้างวันให้บริการใหม่</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* เลือกวันในสัปดาห์ (multi select) */}
        <div>
          <label className="block font-medium mb-2 text-[#30266D]">เลือกวันในสัปดาห์</label>
          <Select
            options={dayOptions}
            isMulti
            value={selectedDays}
            onChange={handleDaysChange}
            placeholder="เลือกวัน..."
            noOptionsMessage={() => 'ไม่มีตัวเลือก'}
            styles={selectStyles}
          />
        </div>

        {/* เลือกวัคซีน */}
        <div>
          <label className="block font-medium mb-2 text-[#30266D]">เลือกวัคซีน</label>
          <Select
            options={vaccines}
            value={selectedVaccine}
            onChange={setSelectedVaccine}
            placeholder="เลือกวัคซีน..."
            noOptionsMessage={() => 'ไม่มีวัคซีนที่ตรงกับคำค้น'}
            styles={selectStyles}
          />
        </div>

        {/* ปุ่ม */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="bg-[#F9669D] text-white px-4 py-2 rounded-md"
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

// 🎨 สไตล์ของ react-select
const selectStyles = {
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
