'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import VaccineServiceDayForm from './formedit/VaccineServiceDaySectionform';
import VaccineServiceDayFormCreate from './formcreate/VaccineServiceDaySectionformCreate';
import { Input } from '@/components/ui/input';

const MySwal = withReactContent(Swal);

export default function VaccineServiceDaySection() {
  const [serviceDays, setServiceDays] = useState([]);
  const [editingItem, setEditingItem] = useState(null);
  const [creatingItem, setCreatingItem] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true); 

  useEffect(() => {
    fetchServiceDays();
  }, []);

  async function fetchServiceDays() {
    try {
      setIsLoading(true); // ✅ เริ่มโหลด
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days?populate=vaccine`,
        { credentials: 'include' }
      );
      const data = await res.json();
      setServiceDays(data.data || []);
    } catch (error) {
      console.error('Error fetching service days:', error);
    } finally {
      setIsLoading(false); // ✅ จบโหลด
    }
  }

  async function handleDelete(id) {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบวันให้บริการนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });

    if (!result.isConfirmed) return;

    try {
      await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/vaccine-service-days/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      fetchServiceDays();
      MySwal.fire('ลบแล้ว!', 'วันให้บริการถูกลบเรียบร้อยแล้ว', 'success');
    } catch (error) {
      console.error('Error deleting service day:', error);
      MySwal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบวันให้บริการได้', 'error');
    }
  }

  const dayNamesTH = {
    0: 'วันอาทิตย์',
    1: 'วันจันทร์',
    2: 'วันอังคาร',
    3: 'วันพุธ',
    4: 'วันพฤหัสบดี',
    5: 'วันศุกร์',
    6: 'วันเสาร์',
  };

  const isEveryDay = (daysArray) =>
    daysArray.length === 7 && [0, 1, 2, 3, 4, 5, 6].every((d) => daysArray.includes(d));

  if (creatingItem) {
    return (
      <VaccineServiceDayFormCreate
        onCancel={() => setCreatingItem(false)}
        onSave={() => {
          setCreatingItem(false);
          fetchServiceDays();
        }}
      />
    );
  }

  if (editingItem !== null) {
    return (
      <VaccineServiceDayForm
        initialData={editingItem}
        onCancel={() => setEditingItem(null)}
        onSave={() => {
          setEditingItem(null);
          fetchServiceDays();
        }}
      />
    );
  }

  const filteredServiceDays = serviceDays.filter(({ attributes }) => {
    const vaccineName = attributes.vaccine?.data?.attributes?.title || '';
    return vaccineName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3">
        <h3 className="text-xl font-semibold text-[#30266D]">จัดการวันให้บริการวัคซีน</h3>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <Input
            placeholder="ค้นหาชื่อวัคซีน..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[250px]"
          />
          <button
            onClick={() => setCreatingItem(true)}
            className="px-4 py-2 bg-[#30266D] text-white rounded-md shadow transition  cursor-pointer"
          >
            + สร้างวันให้บริการใหม่
          </button>
        </div>
      </div>

      <table className="w-full border border-gray-300 rounded-md overflow-hidden shadow-sm">
        <thead className="bg-[#30266D] text-white  select-none">
          <tr>
            <th className="p-3 text-center">วันที่ให้บริการ</th>
            <th className="p-3 text-left">วัคซีนที่เกี่ยวข้อง</th>
            <th className="p-3 text-center">จัดการ</th>
          </tr>
        </thead>
        <tbody className="text-gray-800 ">
          {isLoading ? (
            <tr>
              <td colSpan={3} className="text-center text-gray-500 py-4 select-none">
                กำลังโหลดข้อมูล...
              </td>
            </tr>
          ) : filteredServiceDays.length > 0 ? (
            filteredServiceDays.map(({ id, attributes }) => {
              let daysArray = [];

              if (Array.isArray(attributes.day_of_week)) {
                daysArray = attributes.day_of_week;
              } else if (typeof attributes.day_of_week === 'string') {
                try {
                  daysArray = JSON.parse(attributes.day_of_week);
                  if (!Array.isArray(daysArray)) daysArray = [];
                } catch {
                  daysArray = [];
                }
              }

              const thaiDays = isEveryDay(daysArray)
                ? 'ทุกวัน'
                : daysArray.map((d) => dayNamesTH[d]).filter(Boolean).join(' ');

              const vaccine = attributes.vaccine?.data;

              return (
                <tr key={id} className="border-t border-gray-200 hover:bg-gray-50 transition">
                  <td className="p-3 text-center font-medium">{thaiDays || '-'}</td>
                  <td className="p-3 max-w-sm">
                    {vaccine ? (
                      <span
                        className="bg-[#fabbd2] text-[#30266D] text-sm font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                        title={vaccine.attributes?.title}
                      >
                        {vaccine.attributes?.title}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">ไม่มีวัคซีน</span>
                    )}
                  </td>
                  <td className="p-3 text-center space-x-2">
                    <button
                      onClick={() =>
                        setEditingItem({
                          id,
                          day_of_week: daysArray,
                          vaccine: vaccine
                            ? { id: vaccine.id, attributes: vaccine.attributes }
                            : null,
                        })
                      }
                      className="bg-[#30266D] hover:bg-[#221c59] text-white px-4 py-1 rounded-md transition cursor-pointer"
                    >
                      แก้ไข
                    </button>
                    <button
                      onClick={() => handleDelete(id)}
                      className="bg-[#F9669D] hover:bg-[#cc4e7a] text-white px-4 py-1 rounded-md transition cursor-pointer"
                    >
                      ลบ
                    </button>
                  </td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={3} className="text-center text-gray-500 py-4 select-none">
                ไม่พบรายการวันให้บริการ
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
