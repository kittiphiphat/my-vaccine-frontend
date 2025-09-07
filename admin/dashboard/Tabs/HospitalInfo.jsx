'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import HospitelEdit from './Hospitel/Hospiteledit';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function Hospitels() {
  const router = useRouter();
  const [hospitels, setHospitels] = useState([]);
  const [editingHospitel, setEditingHospitel] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels`;

  const fetchHospitels = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        'pagination[page]': page.toString(),
        'pagination[pageSize]': pageSize.toString(),
        'sort': 'name:asc',
        'populate': '*',
      });

      const res = await fetch(`${API_URL}?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const message = errorData?.error?.message || res.statusText || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
        if (res.status === 401) throw new Error('Unauthorized');
        throw new Error(message);
      }
      const data = await res.json();
      setHospitels(data.data || []);
    } catch (error) {
      await MySwal.fire({
        icon: 'error',
        title: error.message === 'Unauthorized' ? 'กรุณาเข้าสู่ระบบ' : 'เกิดข้อผิดพลาด',
        text: error.message === 'Unauthorized' ? 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' : `ไม่สามารถโหลดข้อมูลโรงพยาบาลได้: ${error.message}`,
        timer: error.message === 'Unauthorized' ? 1500 : undefined,
        showConfirmButton: error.message !== 'Unauthorized',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
      if (error.message === 'Unauthorized') {
        router.replace('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitels();
  }, [router]);

  const handleEdit = (hospitel) => {
    setEditingHospitel(hospitel);
    setCreatingNew(false);
  };

  const handleCreateNew = () => {
    setEditingHospitel(null);
    setCreatingNew(true);
  };

  const handleSave = () => {
    setEditingHospitel(null);
    setCreatingNew(false);
    fetchHospitels();

    if (creatingNew) {
      MySwal.fire({
        icon: 'success',
        title: 'สำเร็จ',
        text: 'เพิ่มข้อมูลโรงพยาบาลเรียบร้อยแล้ว',
        customClass: {
          popup: 'bg-white rounded-xl shadow-lg border border-[#30266D] p-6',
          title: 'text-xl font-bold text-[#30266D] mb-3',
          htmlContainer: 'text-base text-gray-600 font-medium mb-4',
          confirmButton: 'bg-[#F9669D] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105',
        },
      });
    }
  };

  const handleCancel = () => {
    setEditingHospitel(null);
    setCreatingNew(false);
  };

  function formatPhoneNumber(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  return (
    <div
      className="max-w-6xl mx-auto p-4 space-y-6"
      role="main"
      aria-label="จัดการข้อมูลโรงพยาบาล"
    >
      <h2 className="text-2xl font-semibold text-[#30266D] mb-4">
        จัดการข้อมูลโรงพยาบาล
      </h2>

      {!editingHospitel && !creatingNew && hospitels.length === 0 && (
        <div className="flex justify-end mb-6">
          <button
            onClick={handleCreateNew}
            className="px-5 py-2 rounded-xl font-semibold text-white bg-[#F9669D] shadow-md hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
            aria-label="สร้างข้อมูลโรงพยาบาล"
          >
            สร้างข้อมูลโรงพยาบาล
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-[#30266D]/20 border-t-[#30266D] rounded-full animate-pulse"></div>
          <p className="mt-2 text-sm font-medium text-[#30266D]">
            กำลังโหลดข้อมูล...
          </p>
        </div>
      ) : (editingHospitel || creatingNew) ? (
        <HospitelEdit
          hospitel={editingHospitel}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={creatingNew}
        />
      ) : hospitels.length === 0 ? (
        <p className="text-center text-base font-medium text-gray-600">
          ไม่พบข้อมูลโรงพยาบาล
        </p>
      ) : (
        <div className="overflow-x-auto shadow-lg">
          <table
            className="w-full border-collapse rounded-xl overflow-hidden"
            role="grid"
            aria-label="ตารางข้อมูลโรงพยาบาล"
          >
            <thead className="bg-[#30266D]">
              <tr>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  ชื่อโรงพยาบาล
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  ข้อความเตือน
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  โทรศัพท์
                </th>
                <th className="p-3 text-left font-semibold text-sm text-white" scope="col">
                  เว็บไซต์
                </th>
                <th className="p-3 text-center font-semibold text-sm text-white" scope="col">
                  จัดการ
                </th>
              </tr>
            </thead>
            <tbody>
              {hospitels.map(({ id, attributes }, index) => (
                <tr
                  key={id}
                  className={`border-t border-[#30266D]/20 transition duration-200 hover:bg-[#F9669D]/10 ${
                    index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                  }`}
                >
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {attributes.name}
                  </td>
                  <td className="p-3 max-w-md">
                    <div className="text-sm font-semibold text-[#30266D]">
                      {attributes.warningtext}
                    </div>
                    <div className="text-sm text-gray-600">
                      {attributes.subwarningtext}
                    </div>
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {formatPhoneNumber(attributes.phone)}
                  </td>
                  <td className="p-3 text-sm font-medium text-[#30266D]">
                    {attributes.website || '-'}
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleEdit({ id, ...attributes })}
                      className="inline-block px-4 py-1 rounded-xl text-sm font-semibold text-white bg-[#F9669D] shadow-sm hover:bg-[#F9669D]/80 transition-all duration-300 transform hover:scale-105"
                      aria-label={`แก้ไขข้อมูลโรงพยาบาล ${attributes.name}`}
                    >
                      แก้ไขข้อมูล
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}