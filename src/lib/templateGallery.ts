export interface GalleryTemplate {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  html: string;
  templateMode?: boolean;
}

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
    id: "gov-letter",
    title: "หนังสือราชการ",
    titleEn: "Official letter",
    description: "รูปแบบหนังสือราชการพื้นฐาน พร้อม {{ผู้รับ}} {{เรื่อง}}",
    templateMode: true,
    html: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">
<p style="text-align:center"><strong>หนังสือ</strong></p>
<p>ที่ {{เลขที่}} วันที่ {{วันที่}}</p>
<p>เรื่อง {{เรื่อง}}</p>
<p>เรียน {{ผู้รับ}}</p>
<p>เนื้อหา...</p>
<p style="text-align:center">ขอแสดงความนับถือ</p>
<p style="text-align:center">{{ผู้ลงนาม}}</p>
<p style="text-align:center">{{ตำแหน่ง}}</p>
</div></div>`,
  },
  {
    id: "memo",
    title: "บันทึกข้อความ",
    titleEn: "Memo",
    description: "บันทึกข้อความภายในองค์กร",
    html: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">
<p><strong>บันทึกข้อความ</strong></p>
<p>เรื่อง {{เรื่อง}}</p>
<p>เรียน {{ผู้รับ}}</p>
<p>เนื้อหา...</p>
</div></div>`,
  },
  {
    id: "report",
    title: "รายงาน",
    titleEn: "Report",
    description: "โครงรายงานพร้อมหัวข้อ 1–3",
    html: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">
<h1>รายงาน</h1>
<h2>บทที่ 1 บทนำ</h2>
<p>เนื้อหา...</p>
<h2>บทที่ 2 สรุป</h2>
<p>เนื้อหา...</p>
</div></div>`,
  },
  {
    id: "blank-a4",
    title: "เอกสารว่าง A4",
    titleEn: "Blank A4",
    description: "เริ่มจากหน้าว่าง",
    html: `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true"><p></p></div></div>`,
  },
];
