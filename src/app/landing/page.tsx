import type { Metadata } from "next";

import { FAQ } from "@/components/landing/FAQ";
import { Features } from "@/components/landing/Features";
import { Footer } from "@/components/landing/Footer";
import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { SocialProof } from "@/components/landing/SocialProof";

export const metadata: Metadata = {
  title: "หน้าแรก",
  description:
    "แปลง Word เป็น HTML ที่สะอาด — 100% ในเบราว์เซอร์ ไม่มีการอัปโหลดข้อมูล พร้อม A4 preview และตัวทำความสะอาด 8 แบบ",
};

export default function LandingPage() {
  return (
    <>
      <Header active="landing" />
      <main>
        <Hero />
        <Features />
        <SocialProof />
        <HowItWorks />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}

