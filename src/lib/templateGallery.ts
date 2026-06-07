export interface GalleryTemplate {
  id: string;
  title: string;
  titleEn: string;
  description: string;
  html: string;
  templateMode?: boolean;
}

const page = (inner: string) =>
  `<div class="page-node" data-page-number="1"><div class="page-body" data-page-body="true">\n${inner}\n</div></div>`;

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
    id: "gov-letter-external",
    title: "หนังสือภายนอก",
    titleEn: "External official letter",
    description:
      "หนังสือราชการภายนอกตามระเบียบงานสารบรรณ — ที่ / เรื่อง / เรียน / อ้างถึง / สิ่งที่ส่งมาด้วย",
    templateMode: true,
    html: page(`<p style="text-align:center"><strong>{{ส่วนราชการ}}</strong></p>
<p>ที่ {{เลขที่หนังสือ}}</p>
<p>วันที่ {date_th}</p>
<p>เรื่อง&nbsp;&nbsp;&nbsp;{{เรื่อง}}</p>
<p>เรียน&nbsp;&nbsp;&nbsp;{{ผู้รับ}}</p>
<p>อ้างถึง&nbsp;&nbsp;{{อ้างถึง}}</p>
<p>สิ่งที่ส่งมาด้วย&nbsp;&nbsp;{{สิ่งที่ส่งมาด้วย}}</p>
<p style="text-indent:2.5cm">ตามที่ {{อ้างถึง}} นั้น {{ส่วนราชการ}} ขอเรียนว่า …</p>
<p style="text-indent:2.5cm">จึงเรียนมาเพื่อโปรดพิจารณา</p>
<p style="text-align:center;margin-top:1cm">ขอแสดงความนับถือ</p>
<p style="text-align:center">{{ผู้ลงนาม}}</p>
<p style="text-align:center">{{ตำแหน่ง}}</p>
<p style="margin-top:1cm">{{ส่วนราชการเจ้าของเรื่อง}}</p>
<p>โทร. {{โทร}}</p>`),
  },
  {
    id: "memo",
    title: "บันทึกข้อความ",
    titleEn: "Internal memo",
    description: "บันทึกข้อความภายในส่วนราชการ — ส่วนราชการ / ที่ / วันที่ / เรื่อง / เรียน",
    templateMode: true,
    html: page(`<p style="text-align:center"><strong>บันทึกข้อความ</strong></p>
<p><strong>ส่วนราชการ</strong> {{ส่วนราชการ}}</p>
<p><strong>ที่</strong> {{เลขที่หนังสือ}}&nbsp;&nbsp;&nbsp;&nbsp;<strong>วันที่</strong> {date_th}</p>
<p><strong>เรื่อง</strong> {{เรื่อง}}</p>
<p><strong>เรียน</strong> {{ผู้รับ}}</p>
<p style="text-indent:2.5cm">ด้วย {{ส่วนราชการ}} …</p>
<p style="text-indent:2.5cm">จึงเรียนมาเพื่อโปรดพิจารณา</p>
<p style="text-align:right;margin-top:1cm">{{ผู้ลงนาม}}</p>
<p style="text-align:right">{{ตำแหน่ง}}</p>`),
  },
  {
    id: "announcement",
    title: "ประกาศ",
    titleEn: "Announcement",
    description: "ประกาศของส่วนราชการ พร้อมหัวเรื่องและวันที่ประกาศ",
    templateMode: true,
    html: page(`<p style="text-align:center"><strong>ประกาศ{{ส่วนราชการ}}</strong></p>
<p style="text-align:center"><strong>เรื่อง {{เรื่อง}}</strong></p>
<p style="text-align:center">— — — — — — — —</p>
<p style="text-indent:2.5cm">ด้วย {{ส่วนราชการ}} …</p>
<p style="text-indent:2.5cm">จึงประกาศมาเพื่อทราบโดยทั่วกัน</p>
<p style="text-align:center;margin-top:1cm">ประกาศ ณ วันที่ {date_th}</p>
<p style="text-align:center">{{ผู้ลงนาม}}</p>
<p style="text-align:center">{{ตำแหน่ง}}</p>`),
  },
  {
    id: "procurement-request",
    title: "รายงานขอซื้อขอจ้าง",
    titleEn: "Procurement request",
    description:
      "รายงานขอซื้อขอจ้างตามระเบียบพัสดุ — แสดงวงเงินเป็นตัวอักษรอัตโนมัติ ({{วงเงิน|baht}})",
    templateMode: true,
    html: page(`<p style="text-align:center"><strong>รายงานขอซื้อขอจ้าง</strong></p>
<p><strong>ส่วนราชการ</strong> {{ส่วนราชการ}}&nbsp;&nbsp;&nbsp;&nbsp;<strong>วันที่</strong> {date_th}</p>
<p><strong>เรื่อง</strong> ขออนุมัติจัดซื้อจัดจ้าง {{รายการ}}</p>
<p style="text-indent:2.5cm">ด้วย {{ส่วนราชการ}} มีความจำเป็นต้องจัดซื้อจัดจ้าง {{รายการ}} จำนวน {{จำนวน}} เพื่อใช้ในราชการ</p>
<p>วงเงินที่ขออนุมัติ {{วงเงิน}} บาท ({{วงเงิน|baht}})</p>
<p>โดยวิธี {{วิธีการจัดซื้อ}}</p>
<p style="text-indent:2.5cm">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติ</p>
<p style="text-align:right;margin-top:1cm">{{ผู้ขออนุมัติ}}</p>
<p style="text-align:right">{{ตำแหน่ง}}</p>`),
  },
  {
    id: "report",
    title: "รายงาน",
    titleEn: "Report",
    description: "โครงรายงานพร้อมหัวข้อ 1–3",
    html: page(`<h1>รายงาน</h1>
<h2>บทที่ 1 บทนำ</h2>
<p>เนื้อหา...</p>
<h2>บทที่ 2 สรุป</h2>
<p>เนื้อหา...</p>`),
  },
  {
    id: "blank-a4",
    title: "เอกสารว่าง A4",
    titleEn: "Blank A4",
    description: "เริ่มจากหน้าว่าง",
    html: page(`<p></p>`),
  },
];
