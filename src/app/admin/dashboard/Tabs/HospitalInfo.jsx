'use client';

import { useEffect, useState } from 'react';
import HospitelEdit from './Hospitel/Hospiteledit';
import Swal from 'sweetalert2';


export default function Hospitels() {
  const [hospitels, setHospitels] = useState([]);
  const [editingHospitel, setEditingHospitel] = useState(null);
  const [creatingNew, setCreatingNew] = useState(false);

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/hospitels`;

  useEffect(() => {
    fetchHospitels();
  }, []);

 const fetchHospitels = async (page = 1, pageSize = 10) => {
  try {
    const params = new URLSearchParams({
      'pagination[page]': page.toString(),
      'pagination[pageSize]': pageSize.toString(),
      'sort': 'name:asc',      // เรียงชื่อโรงพยาบาลจากน้อยไปมาก
      'populate': '*',
    });

    const res = await fetch(`${API_URL}?${params.toString()}`, {
      credentials: 'include',
    });
    const data = await res.json();
    setHospitels(data.data || []);
  } catch (error) {
    console.error('Error fetching hospitels:', error);
  }
};


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
    Swal.fire({
      icon: 'success',
      title: 'สร้างข้อมูลใหม่สำเร็จ',
      text: 'เพิ่มข้อมูลรายละเอียดใบนัดเรียบร้อยแล้ว',
      confirmButtonColor: '#30266D',
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

  if (cleaned.length === 10) {
    // เบอร์มือถือ
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 9) {
    // เบอร์บ้าน (เช่น 053936539)
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }

  return phone; // คืนค่าตามเดิมถ้าไม่เข้าเงื่อนไข
}

  return (
    <div className="max-w-6xl mx-auto p-4">
      <h2 className="text-2xl font-semibold mb-4 text-[#30266D]">
        จัดการข้อมูลรายละเอียดใบนัด
      </h2>

      {!editingHospitel && !creatingNew && hospitels.length === 0 && (
        <div className="flex justify-end mb-6">
          <button
            onClick={handleCreateNew}
            className="bg-[#30266D] text-white px-5 py-2 rounded shadow hover:bg-[#251f5a] transition cursor-pointer"
          >
            + ข้อมูลรายละเอียดใบนัด
          </button>
        </div>
      )}

      {(editingHospitel || creatingNew) ? (
        <HospitelEdit
          hospitel={editingHospitel}
          onSave={handleSave}
          onCancel={handleCancel}
          isNew={creatingNew}
        />
      ) : (
        <table className="w-full border border-gray-300 rounded-md overflow-hidden shadow-sm">
          <thead className="bg-[#30266D] text-white">
            <tr>
              <th className="p-3 text-left">ชื่อโรงพยาบาล</th>
              <th className="p-3 text-left">ข้อความเตือน</th>
              <th className="p-3 text-left">โทรศัพท์</th>
              <th className="p-3 text-left">เว็บไซต์</th>
              <th className="p-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody className="text-gray-800 ">
            {hospitels.map(({ id, attributes }) => (
              <tr key={id} className="border-t border-gray-200 hover:bg-gray-50">
                <td className="p-3">{attributes.name}</td>
                <td className="p-3 max-w-md">
                  <div className="text-sm font-semibold">{attributes.warningtext}</div>
                  <div className="text-gray-600 text-sm">{attributes.subwarningtext}</div>
                </td>
                 <td className="p-3">{formatPhoneNumber(attributes.phone)}</td>
                <td className="p-3">{attributes.website}</td>
                <td className="p-3 text-center">
                  <button
                    onClick={() => handleEdit({ id, ...attributes })}
                    className="bg-[#30266D] text-white px-4 py-1 rounded hover:bg-[#221c59] transition cursor-pointer"
                  >
                    แก้ไข
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
