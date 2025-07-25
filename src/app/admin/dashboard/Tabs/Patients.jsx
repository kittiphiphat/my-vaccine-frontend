'use client';

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import PatientsEdit from './Patients/Patientsedit';
import { Input } from '@/components/ui/input'; 

const MySwal = withReactContent(Swal);

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingPatient, setEditingPatient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const API_URL = `${process.env.NEXT_PUBLIC_STRAPI_URL}/api/patients`;

const fetchPatients = async () => {
  setLoading(true);
  try {
    const params = new URLSearchParams({
      'pagination[page]': '1',
      'pagination[pageSize]': '100',
    });
    const res = await fetch(`${API_URL}?${params.toString()}`, {
      credentials: 'include',
    });
    const data = await res.json();
    setPatients(data.data || []);
  } catch (error) {
    console.error('เกิดข้อผิดพลาดในการโหลดผู้ป่วย:', error);
  } finally {
    setLoading(false);
  }
};


  useEffect(() => {
    fetchPatients();
  }, []);

  function formatPhoneNumber(phone) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  }

  const handleDelete = async (id) => {
  const result = await MySwal.fire({
    title: 'ยืนยันการลบ',
    text: 'คุณแน่ใจหรือไม่ว่าต้องการลบผู้ป่วยรายนี้?',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'ใช่, ลบเลย',
    cancelButtonText: 'ยกเลิก',
  });

  if (!result.isConfirmed) return;

  try {
    const res = await fetch(`${API_URL}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });

    if (!res.ok) throw new Error('ลบไม่สำเร็จ');

    MySwal.fire('ลบแล้ว', 'ผู้ป่วยถูกลบเรียบร้อย', 'success');
    fetchPatients();
  } catch (error) {
    console.error(error);
    MySwal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบผู้ป่วยได้', 'error');
  }
};


  const handleSave = () => {
    setEditingPatient(null);
    fetchPatients();
  };

  const handleCancel = () => {
    setEditingPatient(null);
  };

  const filteredPatients = patients.filter(({ attributes }) => {
    const fullName = `${attributes.first_name} ${attributes.last_name}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  if (editingPatient) {
    return (
      <div className="max-w-6xl mx-auto p-4">
        <PatientsEdit
          patient={editingPatient}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <h2 className="text-2xl font-semibold text-[#30266D]">จัดการข้อมูลผู้ป่วย</h2>
        <Input
          placeholder="ค้นหาชื่อผู้ป่วย..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-[250px]"
        />
      </div>

      {loading ? (
        <p className="text-center text-[#30266D]">กำลังโหลดข้อมูลผู้ป่วย...</p>
      ) : filteredPatients.length === 0 ? (
        <p className="text-center text-gray-500">
          {searchTerm
            ? `ไม่พบผู้ป่วยที่ตรงกับคำค้น: "${searchTerm}"`
            : 'ไม่พบข้อมูลผู้ป่วย'}
        </p>
      ) : (
        <table className="w-full border-collapse border border-gray-300 shadow-sm rounded-md overflow-hidden ">
          <thead className="bg-[#30266D] text-white">
            <tr>
              <th className="p-3 text-left">ชื่อ-นามสกุล</th>
              <th className="p-3 text-left">เพศ</th>
              <th className="p-3 text-left">อายุ</th>
              <th className="p-3 text-left">เบอร์โทร</th>
              <th className="p-3 text-left">อีเมล</th>
              <th className="p-3 text-center">จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filteredPatients.map(({ id, attributes }) => (
              <tr key={id} className="border-t border-gray-200 hover:bg-gray-50 transition">
                <td className="p-3">{attributes.first_name} {attributes.last_name}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      attributes.gender === 'female'
                        ? 'bg-pink-100 text-pink-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                  >
                    {attributes.gender === 'female' ? 'หญิง' : 'ชาย'}
                  </span>
                </td>
                <td className="p-3">{attributes.age || '-'}</td>
                <td className="p-3">{formatPhoneNumber(attributes.phone)}</td>
                <td className="p-3">{attributes.email || '-'}</td>
                <td className="p-3 text-center space-x-2">
                  <button
                    onClick={() => setEditingPatient({ id, ...attributes })}
                    className="bg-[#30266D] text-white px-3 py-1 rounded hover:bg-[#221c59] cursor-pointer"
                  >
                    แก้ไข
                  </button>
                  <button
                    onClick={() => handleDelete(id)}
                    className="bg-[#F9669D] text-white px-3 py-1 rounded hover:bg-[#cc4e7a] cursor-pointer"
                  >
                    ลบ
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
