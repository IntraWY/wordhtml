"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { driver, type DriveStep } from "driver.js";
import "driver.js/dist/driver.css";
import { useOnboarding } from "@/hooks/useOnboarding";

interface TourProps {
  /** Called when the tour is dismissed (skip or finish). */
  onDismiss?: () => void;
}

export function Tour({ onDismiss }: TourProps) {
  const { hasSeenTour, isReady, skipTour } = useOnboarding();
  const [tourStarted, setTourStarted] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  const buildSteps = useCallback((): DriveStep[] => {
    return [
      {
        element: "[data-tour='welcome']",
        popover: {
          title: "ยินดีต้อนรับสู่ wordhtml",
          description:
            "แปลงเอกสาร Word เป็น HTML สะอาด แก้ไข WYSIWYG บนหน้ากระดาษ A4 และส่งออกได้หลายรูปแบบ — ทำงานทั้งหมดบนเบราว์เซอร์ ไม่มีข้อมูลออกจากเครื่องคุณ",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='upload']",
        popover: {
          title: "เปิดไฟล์ Word (Open File)",
          description:
            "อัปโหลดไฟล์ .docx, .html, หรือ .md แล้วแก้ไขต่อได้ทันที หรือลากไฟล์มาวางบนพื้นที่ตัวแก้ไขก็ได้",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='editor']",
        popover: {
          title: "พิมพ์และแก้ไข (Type & Edit)",
          description:
            "พิมพ์เนื้อหา วางจาก Word หรือจัดรูปแบบด้วยเครื่องมือด้านบน ตัวแก้ไขแสดงผลแบบ WYSIWYG ตรงกับหน้ากระดาษจริง",
          side: "top",
          align: "center",
        },
      },
      {
        element: "[data-tour='layout']",
        popover: {
          title: "ตั้งค่าหน้ากระดาษ (Page Setup)",
          description:
            "ปรับขนาดกระดาษ A4/Letter แนวตั้ง/แนวนอน และระยะขอบ ไม้บรรทัดด้านบนซ้ายช่วยให้ปรับระยะขอบและเยื้องย่อหน้าได้ละเอียด",
          side: "bottom",
          align: "center",
        },
      },
      {
        element: "[data-tour='export']",
        popover: {
          title: "ส่งออก (Export)",
          description:
            "บันทึกเอกสารเป็น HTML, ZIP (แยกรูปภาพ), DOCX หรือ Markdown พร้อมตัวเลือกทำความสะอาดโค้ดอัตโนมัติ",
          side: "bottom",
          align: "center",
        },
      },
    ];
  }, []);

  useEffect(() => {
    if (!isReady || hasSeenTour || tourStarted) return;

    // Wait a short moment so the editor and ribbon have mounted
    // and data-tour attributes are present in the DOM.
    const timer = setTimeout(() => {
      const steps = buildSteps();
      // Only start if at least the first target exists
      const first = document.querySelector(steps[0].element as string);
      if (!first) return;

      const d = driver({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayOpacity: 0.5,
        stagePadding: 4,
        stageRadius: 8,
        popoverClass: "wordhtml-driver-popover",
        nextBtnText: "ถัดไป (Next) ›",
        prevBtnText: "‹ ก่อนหน้า (Prev)",
        doneBtnText: "เริ่มใช้งาน (Get Started)",
        steps,
        onDestroyed: () => {
          skipTour();
          onDismiss?.();
        },
      });

      driverRef.current = d;
      setTourStarted(true);
      d.drive();
    }, 900);

    return () => clearTimeout(timer);
  }, [isReady, hasSeenTour, tourStarted, buildSteps, skipTour, onDismiss]);

  useEffect(() => {
    return () => {
      if (driverRef.current) {
        driverRef.current.destroy();
        driverRef.current = null;
      }
    };
  }, []);

  return null;
}
