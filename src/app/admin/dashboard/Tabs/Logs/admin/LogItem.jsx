'use client';

import React, { useState } from 'react';
import { Copy, ChevronDown, ChevronUp } from 'lucide-react';

const actionLabels = {
  login: { label: 'เข้าสู่ระบบ', color: 'bg-green-100 text-green-700' },
  logout: { label: 'ออกจากระบบ', color: 'bg-red-100 text-red-700' },
  patient_updated: { label: 'แก้ไขข้อมูลผู้ป่วย', color: 'bg-yellow-100 text-yellow-800' },
  vaccine_created: { label: 'สร้างข้อมูลวัคซีน', color: 'bg-blue-100 text-blue-700' },
  vaccine_updated: { label: 'แก้ไขข้อมูลวัคซีน', color: 'bg-purple-100 text-purple-700' },
  vaccine_deleted: { label: 'ลบข้อมูลวัคซีน', color: 'bg-pink-100 text-pink-700' },
  booking_setting_created: { label: 'สร้างตั้งค่าการจอง', color: 'bg-indigo-100 text-indigo-700' },
  booking_setting_updated: { label: 'แก้ไขตั้งค่าการจอง', color: 'bg-teal-100 text-teal-700' },
  booking_setting_deleted: { label: 'ลบการตั้งค่าช่วงเวลาการจอง', color: 'bg-pink-100 text-pink-700' },
  vaccine_service_day_deleted: { label: 'ลบวันให้บริการวัคซีน', color: 'bg-pink-100 text-pink-700' },
  vaccine_time_slot_created: { label: 'สร้างช่วงเวลาวัคซีน', color: 'bg-cyan-100 text-cyan-700' },
  vaccine_time_slot_deleted: { label: 'ลบช่วงเวลาวัคซีน', color: 'bg-pink-100 text-pink-700' },
  vaccine_service_day_created: { label: 'สร้างวันให้บริการวัคซีน', color: 'bg-lime-100 text-lime-700' },
};

const fieldLabels = {
  vaccineId: 'รหัสวัคซีน',
  vaccineTitle: 'ชื่อวัคซีน',
  minAge: 'อายุขั้นต่ำ',
  maxAge: 'อายุสูงสุด',
  gender: 'เพศ',
  maxQuota: 'จำนวนสูงสุด',
  bookingStartDate: 'วันเริ่มจอง',
  bookingEndDate: 'วันสิ้นสุดจอง',
  advance_booking_days: 'จำนวนวันจองล่วงหน้า',
  prevent_last_minute_minutes: 'ระยะเวลาห้ามจองนาทีสุดท้าย',
  slotDurationMinutes: 'ระยะเวลาช่วงเวลา (นาที)',
  is_enabled: 'สถานะ',
  id: 'รหัส',
  startTime: 'เวลาเริ่มต้น',
  endTime: 'เวลาสิ้นสุด',
  quota: 'จำนวนโควต้า',
  createdAt: 'สร้างเมื่อ',
  updatedAt: 'แก้ไขเมื่อ',
  publishedAt: 'เผยแพร่เมื่อ',
  day_of_week: 'วันให้บริการ',
  vaccine: 'วัคซีน',
  userId: 'รหัสผู้ใช้',
  username: 'ชื่อผู้ใช้',
  email: 'อีเมล',
  role: 'สิทธิ์',
};

export function formatDetailsText(details, action) {
  if (!details) return '-';

  const before = details.before || {};
  const after = details.after || {};

  if (action === 'login' || action === 'logout') {
    const obj = isUserInfoObject(before) ? before
              : isUserInfoObject(after) ? after
              : isUserInfoObject(details) ? details
              : null;
    if (obj) {
      return `ชื่อผู้ใช้: ${obj.username}\nอีเมล: ${obj.email}\nบทบาท: ${obj.role}`;
    }
    return 'ไม่มีรายละเอียดเพิ่มเติม';
  }

  const keys = Array.from(new Set([
    ...Object.keys(before).filter(k => before[k] !== null && before[k] !== undefined && before[k] !== ''),
    ...Object.keys(after).filter(k => after[k] !== null && after[k] !== undefined && after[k] !== ''),
  ]));

  if (keys.length === 0) return '-';

  // ตรวจสอบว่ามีข้อมูล before จริงหรือไม่
  const hasBeforeData = Object.keys(before).some(
    key => before[key] !== null && before[key] !== undefined && before[key] !== ''
  );

  let text = '';

  if (hasBeforeData) {
    text += 'ก่อนแก้ไข:\n';
    keys.forEach(key => {
      if (before[key] !== undefined && before[key] !== null && before[key] !== '') {
        text += `  ${fieldLabels[key] || key}: ${formatValue(key, before[key])}\n`;
      }
    });
  } else {
    text += 'ก่อนแก้ไข: ไม่มีข้อมูลการแก้ไข\n\n';
  }

  text += 'หลังแก้ไข:\n';
  keys.forEach(key => {
    if (after[key] !== undefined && after[key] !== null && after[key] !== '') {
      text += `  ${fieldLabels[key] || key}: ${formatValue(key, after[key])}\n`;
    }
  });

  return text.trim();
}



export function formatDateTimeThai(datetime) {
  if (!datetime) return '-';
  try {
    const d = new Date(datetime);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear() + 543;
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes} น.`;
  } catch {
    return datetime;
  }
}

function formatTimeShort(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return '-';
  return timeStr.slice(0, 5);
}

function formatValue(key, val) {
  if (val === null || val === undefined || val === '') return '-';

  const genderMap = { male: 'ชาย', female: 'หญิง', any: 'ทุกเพศ' };
  const dayOfWeekMap = {
    0: 'อาทิตย์',
    1: 'จันทร์',
    2: 'อังคาร',
    3: 'พุธ',
    4: 'พฤหัสบดี',
    5: 'ศุกร์',
    6: 'เสาร์',
  };

  if (key === 'gender') return genderMap[val] || val;
  if (key === 'minAge' || key === 'maxAge') return `${val} ปี`;
  if (key === 'createdAt' || key === 'updatedAt' || key === 'publishedAt' || key === 'timestamp') {
    return formatDateTimeThai(val);
  }
  if (key === 'day_of_week' && Array.isArray(val)) {
    return val.map(d => dayOfWeekMap[d] || d).join(', ');
  }
  if (key === 'is_enabled') {
    return val === true || val === 'true' ? 'เปิดใช้งาน' : val === false || val === 'false' ? 'ปิดใช้งาน' : '-';
  }
  if (key === 'vaccine' && typeof val === 'object' && val !== null) {
    return val.title || '-';
  }
  if (key === 'startTime' || key === 'endTime') {
    return formatTimeShort(val);
  }
  return val.toString();
}

const isUserInfoObject = (obj) => {
  return obj
    && typeof obj === 'object'
    && obj.userId !== undefined
    && obj.username !== undefined
    && obj.email !== undefined
    && obj.role !== undefined;
};

function renderDetailsInThai(details, action) {
  if (!details) return '-';

  const before = details.before || {};
  const after = details.after || {};

  if (action === 'login' || action === 'logout') {
    if (isUserInfoObject(before)) {
      return (
        <div className="text-sm space-y-1">
          <p><strong>ชื่อผู้ใช้:</strong> {before.username}</p>
          <p><strong>อีเมล:</strong> {before.email}</p>
          <p><strong>บทบาท:</strong> {before.role}</p>
        </div>
      );
    }
    if (isUserInfoObject(after)) {
      return (
        <div className="text-sm space-y-1">
          <p><strong>ชื่อผู้ใช้:</strong> {after.username}</p>
          <p><strong>อีเมล:</strong> {after.email}</p>
          <p><strong>บทบาท:</strong> {after.role}</p>
        </div>
      );
    }
    if (isUserInfoObject(details)) {
      return (
        <div className="text-sm space-y-1">
          <p><strong>ชื่อผู้ใช้:</strong> {details.username}</p>
          <p><strong>อีเมล:</strong> {details.email}</p>
          <p><strong>บทบาท:</strong> {details.role}</p>
        </div>
      );
    }
    return <p className="text-gray-500 italic">ไม่มีรายละเอียดเพิ่มเติม</p>;
  }

  const filteredBeforeKeys = Object.keys(before).filter(key => {
    const val = before[key];
    if (val === null || val === undefined || val === '' || val === '-') return false;
    if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) return false;
    return true;
  });

  const filteredAfterKeys = Object.keys(after).filter(key => {
    const val = after[key];
    if (val === null || val === undefined || val === '' || val === '-') return false;
    if (typeof val === 'object' && val !== null && Object.keys(val).length === 0) return false;
    return true;
  });

  const allKeys = Array.from(new Set([...filteredBeforeKeys, ...filteredAfterKeys]));

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
      <div>
        <p className="font-semibold text-[#30266D] mb-2">ก่อนแก้ไข:</p>
        {filteredBeforeKeys.length > 0 ? (
          allKeys.map(key => (
            filteredBeforeKeys.includes(key) ? (
              <p key={key}>
                <span className="font-medium">{fieldLabels[key] || key}</span>: {formatValue(key, before[key])}
              </p>
            ) : null
          ))
        ) : (
          <p className="text-gray-500 italic">ไม่มีข้อมูลก่อนแก้ไข</p>
        )}
      </div>
      <div>
        <p className="font-semibold text-[#F9669D] mb-2">หลังแก้ไข:</p>
        {filteredAfterKeys.length > 0 ? (
          allKeys.map(key => (
            filteredAfterKeys.includes(key) ? (
              <p key={key}>
                <span className="font-medium">{fieldLabels[key] || key}</span>: {formatValue(key, after[key])}
              </p>
            ) : null
          ))
        ) : (
          <p className="text-gray-500 italic">ไม่มีข้อมูลหลังแก้ไข</p>
        )}
      </div>
    </div>
  );
}

export default function LogItem({ log, onExportRow }) {
  const { id, attributes } = log;
  const { action, message, timestamp, details } = attributes;
  const [openDetails, setOpenDetails] = useState(false);
  const [openJson, setOpenJson] = useState(false);

  
  const actionInfo = actionLabels[action] || { label: action, color: 'bg-gray-100 text-gray-800' };

  const copyToClipboard = (json) => {
  navigator.clipboard.writeText(JSON.stringify(json, null, 2))
    .then(() => {
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'คัดลอกข้อมูล JSON แล้ว',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
        customClass: {
          popup: 'my-toast',
        },
      });
    })
    .catch(() => {
      MySwal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: 'คัดลอกข้อมูลไม่สำเร็จ',
        showConfirmButton: false,
        timer: 2000,
        timerProgressBar: true,
         customClass: {
          popup: 'my-toast',
        },
      });
      
    });
};

  return (
    <li className="border rounded-xl shadow-sm p-6 bg-white hover:shadow-md transition">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${actionInfo.color} mb-2`}>
            {actionInfo.label}
          </span>
          <p className="text-gray-800">{message}</p>
          <p className="text-xs text-gray-500 mt-1">{formatDateTimeThai(timestamp)}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setOpenDetails(!openDetails)}
            className="text-sm flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-100"
          >
            {openDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            รายละเอียด
          </button>
          <button
            onClick={() => setOpenJson(!openJson)}
            className="text-sm flex items-center gap-1 px-3 py-1 border rounded hover:bg-gray-100"
          >
            {openJson ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            JSON
          </button>
        </div>
      </div>

      {openDetails && (
        <div className="mt-4 relative">
          <p className="font-semibold mb-2 text-[#30266D]">รายละเอียด </p>
          <div className="mt-4 border rounded bg-gray-50 p-4 text-sm">
            {renderDetailsInThai(details, action)}
          </div>
        </div>
      )}

      {openJson && (
        <div className="mt-4 relative">
          <p className="font-semibold mb-2 text-[#F9669D]">รายละเอียด JSON</p>
          <div className="relative bg-gray-100 border rounded p-3 overflow-x-auto text-gray-800 text-xs">
            <button
              onClick={() => copyToClipboard(details)}
              className="absolute top-2 right-2 bg-[#30266D] text-white px-2 py-1 rounded hover:bg-[#F9669D] cursor-pointer"
              title="คัดลอก JSON"
            >
              <Copy size={16} />
            </button>
            <pre className="whitespace-pre-wrap">{JSON.stringify(details, null, 2)}</pre>
          </div>
        </div>
      )}
    </li>
  );
}
