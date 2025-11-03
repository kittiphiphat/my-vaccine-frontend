"use client";

import { usePathname } from "next/navigation";


import GlobalErrorChecker from "./GlobalErrorChecker";
import Navbar from "./navbar";

export default function ClientWrapper({ children }) {
  const pathname = usePathname();
  const showNavbar = pathname !== "/check-server" && pathname !== "/welcome" && pathname !== "/admin/dashboard";

  return (
    <>
      <GlobalErrorChecker />
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}