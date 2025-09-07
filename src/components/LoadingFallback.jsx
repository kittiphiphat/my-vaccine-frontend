'use client';

import { useEffect } from 'react';
import Swal from 'sweetalert2';

export default function LoadingFallback() {
  useEffect(() => {
    Swal.fire({
      title: 'กำลังโหลดข้อมูล...',
      timer: 1500,
      timerProgressBar: true,
      didOpen: () => {
        Swal.showLoading();
      },
      willClose: () => {},
    });
  }, []);

  return null; 
}
