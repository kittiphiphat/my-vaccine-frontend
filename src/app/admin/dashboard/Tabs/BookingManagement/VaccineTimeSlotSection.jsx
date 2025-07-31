'use client';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import VaccineTimeSlotForm from './formedit/VaccineTimeSlotform';
import VaccineTimeSlotFormCreate from './formcreate/VaccineTimeSlotformCreate';
import { Input } from '@/components/ui/input'; 

const MySwal = withReactContent(Swal);

export default function VaccineTimeSlotSection() {
  const [timeSlots, setTimeSlots] = useState([]);
  const [editingSlot, setEditingSlot] = useState(null);
  const [creatingSlot, setCreatingSlot] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTimeSlots();
  }, []);

  async function fetchTimeSlots() {
    setLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots?populate=vaccine`, {
        credentials: 'include',
      });
      const data = await res.json();
      setTimeSlots(data.data || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบช่วงเวลานี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-time-slots/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchTimeSlots();
      MySwal.fire('ลบแล้ว!', 'ช่วงเวลาถูกลบเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error deleting slot:', error);
      MySwal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบช่วงเวลาได้', 'error');
    }
  }

  const handleCancelEdit = () => setEditingSlot(null);
  const handleSaveEdit = () => {
    setEditingSlot(null);
    fetchTimeSlots();
  };

  const handleCancelCreate = () => setCreatingSlot(false);
  const handleSaveCreate = () => {
    setCreatingSlot(false);
    fetchTimeSlots();
  };

  const filteredSlots = timeSlots.filter(({ attributes }) => {
    const title = attributes.vaccine?.data?.attributes?.title || '';
    return title.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (editingSlot !== null) {
    return (
      <VaccineTimeSlotForm
        initialData={editingSlot}
        onCancel={handleCancelEdit}
        onSave={handleSaveEdit}
      />
    );
  }

  if (creatingSlot) {
    return (
      <VaccineTimeSlotFormCreate
        onCancel={handleCancelCreate}
        onSave={handleSaveCreate}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <h3 className="text-xl font-semibold text-[#30266D]">จัดการช่วงเวลาให้บริการ</h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาชื่อวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px]"
          />
          <button
            onClick={() => setCreatingSlot(true)}
            className="px-4 py-2 bg-[#30266D] hover:bg-[#221c59] text-white rounded-md cursor-pointer"
          >
            + สร้างช่วงเวลาใหม่
          </button>
        </div>
      </div>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden shadow-sm">
        <thead className="bg-[#30266D] text-white select-none">
          <tr>
            <th className="py-3 px-4 text-left font-semibold">วัคซีน</th>
            <th className="py-3 px-4 text-center font-semibold">เวลาเริ่ม</th>
            <th className="py-3 px-4 text-center font-semibold">เวลาสิ้นสุด</th>
            <th className="py-3 px-4 text-center font-semibold">จำนวนที่รับ</th>
            <th className="py-3 px-4 text-center font-semibold">สถานะ</th>
            <th className="py-3 px-4 text-center font-semibold">จัดการ</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="text-center text-gray-500 py-6">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
          ) : filteredSlots.length > 0 ? (
            filteredSlots.map(({ id, attributes }, index) => (
              <tr
                key={id}
                className={`${
                  index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                } hover:bg-gray-100 transition-colors`}
              >
                <td className="py-3 px-4 text-gray-700 font-medium">{attributes.vaccine?.data?.attributes?.title || '-'}</td>
                <td className="py-3 px-4 text-center text-gray-700 ">{attributes.startTime.slice(0, 5)}</td>
                <td className="py-3 px-4 text-center text-gray-700 ">{attributes.endTime.slice(0, 5)}</td>
                <td className="py-3 px-4 text-center text-gray-700">{attributes.quota}</td>
                <td className="py-3 px-4 text-center">
                  {attributes.is_enabled ? (
                    <span className="inline-block px-3 py-1 rounded-full bg-green-100 text-green-800 font-semibold select-none">
                      เปิดใช้งาน
                    </span>
                  ) : (
                    <span className="inline-block px-3 py-1 rounded-full bg-red-100 text-red-600 font-semibold select-none">
                      ปิด
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-center space-x-2">
                  <button
                    onClick={() => setEditingSlot({ id, ...attributes })}
                    className="inline-block px-3 py-1 rounded-md bg-[#30266D] text-white font-semibold hover:bg-[#4b3b8a] transition cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(id)}
                    className="inline-block px-3 py-1 rounded-md bg-[#F9669D] text-white font-semibold hover:bg-[#e24d8a] transition cursor-pointer"
                  >
                    ลบ
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="text-center text-gray-500 py-6 select-none">
                ไม่พบช่วงเวลาให้บริการ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
