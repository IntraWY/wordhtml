import type { Metadata } from "next";

import { EditorShell } from "@/components/editor/EditorShell";

export const metadata: Metadata = {
  title: "โปรแกรมแก้ไข",
  description:
    "แก้ไขเอกสารด้วยโปรแกรมแก้ไขแบบ Visual พร้อม A4 Preview แล้วส่งออก HTML ที่สะอาด",
};

export default function HomePage() {
  return <EditorShell />;
}
