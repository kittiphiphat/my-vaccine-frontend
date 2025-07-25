'use client';

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function VaccinesList({ vaccines, onEdit, onDelete }) {
  if (!vaccines || vaccines.length === 0) {
    return <p className="text-center text-gray-500">ไม่มีข้อมูลวัคซีน</p>;
  }

  const handleDelete = async (id) => {
    const result = await MySwal.fire({
      title: 'ยืนยันการลบ',
      text: 'คุณแน่ใจหรือไม่ว่าต้องการลบวัคซีนนี้?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก',
    });

    if (result.isConfirmed) {
      await onDelete(id);
    }
  };

  const genderMap = {
    male: {
      label: 'ชาย',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-600',
    },
    female: {
      label: 'หญิง',
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-600',
    },
    other: {
      label: 'ทุกเพศ',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-600',
    },
  };

  const getGenderInfo = (gender) => {
    const key = (gender || 'other').toLowerCase();
    return genderMap[key] || genderMap['other'];
  };

  return (
    <table className="w-full border-collapse border border-gray-300 rounded-md overflow-hidden shadow-md">
      <thead className="bg-[#30266D] text-white">
        <tr>
          <th className="p-3 text-left">ชื่อวัคซีน</th>
          <th className="p-3 text-left">ช่วงอายุ (ปี)</th>
          <th className="p-3 text-left">เพศ</th>
          <th className="p-3 text-left">จำนวนสูงสุด</th>
          <th className="p-3 text-left">จองไปแล้ว</th>
          <th className="p-3 text-left">สถานะ</th>
          <th className="p-3 text-center">จัดการ</th>
        </tr>
      </thead>
      <tbody>
        {vaccines.map(({ id, attributes }) => {
          const genderInfo = getGenderInfo(attributes.gender);
          return (
            <tr key={id} className="border-t border-gray-300">
              <td className="p-3">{attributes.title}</td>
              <td className="p-3">
                {attributes.minAge} - {attributes.maxAge}
              </td>
              <td className="p-3">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${genderInfo.bgColor} ${genderInfo.textColor}`}
                >
                  {genderInfo.label}
                </span>
              </td>
              <td className="p-3">{attributes.maxQuota}</td>
              <td className="p-3">{attributes.booked}</td>
              <td className="p-3">
                {attributes.booked >= attributes.maxQuota ? (
                  <span className="text-red-500 font-semibold">เต็มแล้ว</span>
                ) : (
                  <span className="text-green-600 font-semibold">ว่าง</span>
                )}
              </td>
              <td className="p-3 text-center space-x-2">
                <button
                  onClick={() => onEdit({ id, ...attributes })}
                  className="bg-[#30266D] text-white px-3 py-1 rounded-md hover:bg-[#251f5a] transition-colors duration-200 cursor-pointer"
                >
                  แก้ไข
                </button>
                <button
                  onClick={() => handleDelete(id)}
                  className="bg-[#F9669D] text-white px-3 py-1 rounded-md hover:bg-[#d75985] transition-colors duration-200 cursor-pointer"
                >
                  ลบ
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
