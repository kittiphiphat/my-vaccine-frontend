"use client";

import { usePathname } from "next/navigation";

import Navbar from "./navbar";
import GlobalErrorChecker from "./GlobalErrorChecker";

export default function ClientWrapper({ children }) {
  const pathname = usePathname();
  const showNavbar = pathname !== "/check-server" && pathname !== "/welcome";

  return (
    <>
      <GlobalErrorChecker />
      {showNavbar && <Navbar />}
      {children}
    </>
  );
}