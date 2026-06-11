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

const pages = (...inners: string[]) =>
  inners
    .map(
      (inner, i) =>
        `<div class="page-node" data-page-number="${i + 1}"><div class="page-body" data-page-body="true">\n${inner}\n</div></div>`
    )
    .join("");

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
    id: "pea-temp-switch",
    title: "ขออนุมัติติดตั้งอุปกรณ์ตัดตอนชั่วคราว (กฟภ.)",
    titleEn: "PEA temporary switch installation request",
    description:
      "บันทึกขออนุมัติติดตั้ง LBS SF6 / สวิตช์ใบมีดชั่วคราว 2 หน้า — หน้าบันทึก + แบบฟอร์มแจ้งความประสงค์ (ตารางพิกัดเพิ่มแถวได้)",
    templateMode: true,
    html: pages(
      `<p>จาก {{หน่วยงานผู้ขอ}}&nbsp;&nbsp;&nbsp;&nbsp;ถึง {{หน่วยงานผู้รับ}}</p>
<p>เลขที่ {{เลขที่หนังสือ}}&nbsp;&nbsp;&nbsp;&nbsp;วันที่ {date_th}</p>
<p><strong>เรื่อง</strong> ขออนุมัติติดตั้งและนำอุปกรณ์เชื่อมเข้าระบบจำหน่าย 22 เควี. สถานีไฟฟ้า{{สถานี}}</p>
<p><strong>เรียน</strong> {{เรียน}}</p>
<p style="text-indent:2.5cm">ตามที่ {{ที่มาของงาน}} นั้น</p>
<p style="text-indent:2.5cm">ในการนี้ เพื่อเพิ่มความมั่นคงในระบบการจ่ายกระแสไฟฟ้า รวมถึงเพื่ออำนวยความสะดวก รวดเร็ว และเกิดความปลอดภัยในระหว่างการปฏิบัติงานก่อสร้างระบบจำหน่ายไฟฟ้า 22 เควี ดังกล่าว {{หน่วยงานผู้ขอ}} จึงขออนุมัติติดตั้ง{{ชนิดอุปกรณ์}}ชั่วคราว ใหม่ ในไลน์เมนฟีดเดอร์ {{ฟีดเดอร์}} สถานีไฟฟ้า{{สถานี}} จำนวน {{จำนวนจุด}} จุด ({{จำนวนชุด}} ชุด) ตามรายละเอียดพิกัดเชิงตำแหน่งดังนี้</p>
<table><tbody>
<tr><td><p><strong>ที่</strong></p></td><td><p><strong>อุปกรณ์</strong></p></td><td colspan="2"><p><strong>พิกัดเชิงตำแหน่ง Lat,Long</strong></p></td><td><p><strong>หมายเหตุ</strong></p></td></tr>
<tr data-repeat="true"><td><p>{{ลำดับ}}</p></td><td><p>{{อุปกรณ์}}</p></td><td><p>{{ละติจูด}}</p></td><td><p>{{ลองจิจูด}}</p></td><td><p>{{หมายเหตุ}}</p></td></tr>
</tbody></table>
<p style="text-indent:2.5cm">จึงเรียนมาเพื่อโปรดพิจารณาอนุมัติและแจ้งส่วนเกี่ยวข้องดำเนินการต่อไป</p>
<p style="text-align:center;margin-top:1cm">({{ผู้ลงนาม}})</p>
<p style="text-align:center">ตำแหน่ง {{ตำแหน่งผู้ลงนาม}}</p>
<p style="text-align:center">{{แผนก}}</p>
<p style="text-align:center">โทร.{{โทร}}</p>`,
      `<p style="text-align:center"><strong>แบบฟอร์มแจ้งความประสงค์ เพื่อติดตั้งอุปกรณ์ตัดตอน (โหลดเบรกสวิตช์ SF6, สวิตช์ใบมีด) แบบชั่วคราว</strong></p>
<table><tbody>
<tr><td><p><strong>ลำดับที่</strong></p></td><td><p><strong>สฟฟ.</strong></p></td><td><p><strong>ฟีดเดอร์</strong></p></td><td><p><strong>ชนิดอุปกรณ์ฯ</strong></p></td><td><p><strong>จำนวน (ชุด)</strong></p></td><td><p><strong>บริเวณที่จะติดตั้ง</strong></p></td><td><p><strong>พิกัด Lat, Long</strong></p></td><td><p><strong>ช่วงเวลาติดตั้ง</strong></p></td><td><p><strong>หมายเหตุ</strong></p></td></tr>
<tr data-repeat="true"><td><p>{{ลำดับ}}</p></td><td><p>{{สถานี}}</p></td><td><p>{{ฟีดเดอร์}}</p></td><td><p>{{อุปกรณ์}}</p></td><td><p>{{จำนวนชุด}}</p></td><td><p>{{สถานที่ติดตั้ง}}</p></td><td><p>({{ละติจูด}}, {{ลองจิจูด}})</p></td><td><p>{{ช่วงเวลา}}</p></td><td><p>{{หมายเหตุ}}</p></td></tr>
</tbody></table>
<p>ทั้งนี้ กรณีแจ้งติดตั้งอุปกรณ์ชนิดโหลดเบรกสวิตช์ SF6 ให้ กฟฟ. ทำการตรวจสอบสภาพความพร้อมใช้งานของอุปกรณ์ฯ</p>
<p>มีผลการตรวจสอบฯ เป็นดังนี้</p>
<p>1. สภาพภายนอกโดยรวม&nbsp;&nbsp;☐ ปกติ&nbsp;&nbsp;☐ ไม่ปกติ</p>
<p>2. ระดับแก๊ส SF6&nbsp;&nbsp;☐ ปกติ&nbsp;&nbsp;☐ ไม่ปกติ</p>
<p>3. กลไกการล็อคและปลดล็อคคาน&nbsp;&nbsp;☐ ปกติ&nbsp;&nbsp;☐ ไม่ปกติ</p>
<p>4. หน้าสัมผัส สับเข้า/ปลดออก ได้ทั้ง 3 เฟส&nbsp;&nbsp;☐ ปกติ&nbsp;&nbsp;☐ ไม่ปกติ</p>
<p>{{หน่วยงานผู้ขอ}} ขอรับรองว่าแผนผังแสดงจุด ติดตั้ง/รื้อถอน/รื้อย้าย อุปกรณ์ตัดตอน เป็นการชั่วคราว ข้างต้น มีความถูกต้องครบถ้วนเหมาะสมแล้ว</p>
<table><tbody>
<tr><td data-borders="none" style="border:none"><p>ลงนามผู้จัดทำ : ………………………………………</p><p style="text-align:center">({{ผู้จัดทำ}})</p><p style="text-align:center">ตำแหน่ง : {{ตำแหน่งผู้จัดทำ}}</p><p style="text-align:center">วันที่ : {date_th}</p></td><td data-borders="none" style="border:none"><p>ลงนามผู้รับรอง : ………………………………………</p><p style="text-align:center">({{ผู้รับรอง}})</p><p style="text-align:center">ตำแหน่ง : {{ตำแหน่งผู้รับรอง}}</p><p style="text-align:center">วันที่ : {date_th}</p></td></tr>
</tbody></table>
<p>แผนผัง Diagram ประกอบ</p>
<p></p>`
    ),
  },
  {
    id: "budget-certification",
    title: "แบบฟอร์มรับรองยอดงบประมาณ (ใบตัดงบ)",
    titleEn: "Budget certification form",
    description:
      "ใบตัดงบ — หมายเลขงาน/WBS, ตารางค่าใช้จ่าย 4 หมวด (งบประมาณ/เบิกแล้ว/คงเหลือ/เบิกครั้งนี้), โครงข่าย-กิจกรรม, ช่องลงนามคู่",
    templateMode: true,
    html: page(`<p style="text-align:right">เลขที่ {{เลขที่}}</p>
<p style="text-align:right">วันที่ {date_th}</p>
<p style="text-align:center"><strong>แบบฟอร์มรับรองยอดงบประมาณ</strong></p>
<p>หมายเลขงาน {{หมายเลขงาน}}&nbsp;&nbsp;&nbsp;&nbsp;WBS {{เลขWBS}}&nbsp;&nbsp;&nbsp;&nbsp;ชื่อผู้เบิก {{ผู้เบิก}}</p>
<p>สังกัด {{สังกัด}}</p>
<table><tbody>
<tr><td><p><strong>ค่าใช้จ่ายตามงบประมาณ</strong></p></td><td><p><strong>จำนวนเงินงบประมาณ</strong></p></td><td><p><strong>จำนวนเงินเบิกจ่ายแล้ว</strong></p></td><td><p><strong>จำนวนเงินคงเหลือ</strong></p></td><td><p><strong>จำนวนเงินเบิกจ่ายครั้งนี้</strong></p></td></tr>
<tr><td><p>ค่าแรงจ้างเหมา (53010060)</p></td><td><p>{{งบค่าแรง}}</p></td><td><p>{{เบิกแล้วค่าแรง}}</p></td><td><p>{{คงเหลือค่าแรง}}</p></td><td><p>{{เบิกครั้งนี้ค่าแรง}}</p></td></tr>
<tr><td><p>ค่าควบคุมงาน (53052040)</p></td><td><p>{{งบควบคุมงาน}}</p></td><td><p>{{เบิกแล้วควบคุมงาน}}</p></td><td><p>{{คงเหลือควบคุมงาน}}</p></td><td><p>{{เบิกครั้งนี้ควบคุมงาน}}</p></td></tr>
<tr><td><p>ค่าขนส่ง (53069020)</p></td><td><p>{{งบขนส่ง}}</p></td><td><p>{{เบิกแล้วขนส่ง}}</p></td><td><p>{{คงเหลือขนส่ง}}</p></td><td><p>{{เบิกครั้งนี้ขนส่ง}}</p></td></tr>
<tr><td><p>ค่าเบ็ดเตล็ด</p></td><td><p>{{งบเบ็ดเตล็ด}}</p></td><td><p>{{เบิกแล้วเบ็ดเตล็ด}}</p></td><td><p>{{คงเหลือเบ็ดเตล็ด}}</p></td><td><p>{{เบิกครั้งนี้เบ็ดเตล็ด}}</p></td></tr>
</tbody></table>
<p>เลขที่โครงข่าย {{เลขโครงข่าย}}&nbsp;&nbsp;&nbsp;&nbsp;Network {{Network}}</p>
<p>กิจกรรม {{กิจกรรม}}</p>
<table><tbody>
<tr><td data-borders="none" style="border:none"><p style="text-align:center">ลงชื่อ……………………………………. (ผู้ขอเบิก)</p><p style="text-align:center">({{ผู้ขอเบิก}})</p></td><td data-borders="none" style="border:none"><p style="text-align:center">ลงชื่อ……………………………………. (ผู้รับรอง)</p><p style="text-align:center">({{ผู้รับรอง}})</p></td></tr>
</tbody></table>`),
  },
  {
    id: "material-return",
    title: "ฟอร์มส่งคืนพัสดุ",
    titleEn: "Material return form",
    description:
      "เอกสารส่งคืนพัสดุรื้อถอน — งาน/WBS, ตารางรายการพัสดุ (เพิ่มแถวได้), ลงนาม 3 ฝ่าย และส่วนพัสดุรับเข้าบัญชี",
    templateMode: true,
    html: page(`<p>จาก {{หน่วยงานผู้ส่ง}}&nbsp;&nbsp;&nbsp;&nbsp;ถึง {{หน่วยงานผู้รับ}}</p>
<p>เลขที่ {{เลขที่หนังสือ}}&nbsp;&nbsp;&nbsp;&nbsp;วันที่ {date_th}</p>
<p><strong>เรื่อง</strong> การส่งคืนพัสดุ</p>
<p><strong>เรียน</strong> {{เรียน}}</p>
<p style="text-indent:2.5cm">ตามอนุมัติที่ {{เลขที่อนุมัติ}} ให้ดำเนินการ ( ) ก่อสร้าง&nbsp;&nbsp;( ) รื้อถอนระบบไฟฟ้า ชื่องาน {{ชื่องานคำอธิบาย}}</p>
<p>องค์ประกอบ WBS/ใบสั่ง {{เลขWBS}}</p>
<p style="text-indent:2.5cm">บัดนี้ งานดังกล่าวได้เสร็จเรียบร้อยแล้ว มีพัสดุที่ต้องการส่งคืนให้คลังพัสดุรับเข้าบัญชี - เบิกใช้งานคืน ตามรายละเอียดดังต่อไปนี้</p>
<table><tbody>
<tr><td><p><strong>ระบบงาน</strong></p></td><td><p><strong>รหัสพัสดุ</strong></p></td><td><p><strong>สภาพ</strong></p></td><td><p><strong>องค์ประกอบ WBS/โครงข่ายกิจกรรม</strong></p></td><td><p><strong>รหัสบัญชีแยกประเภท</strong></p></td><td><p><strong>ปริมาณ (ชิ้น)</strong></p></td><td><p><strong>ราคา/ชิ้น (บาท)</strong></p></td><td><p><strong>มูลค่า (บาท)</strong></p></td><td><p><strong>หมายเหตุ</strong></p></td></tr>
<tr data-repeat="true"><td><p>{{ระบบงาน}}</p></td><td><p>{{รหัสพัสดุ}}</p></td><td><p>{{สภาพ}}</p></td><td><p>{{WBSรายการ}}</p></td><td><p>{{รหัสบัญชี}}</p></td><td><p>{{ปริมาณ}}</p></td><td><p>{{ราคาต่อชิ้น}}</p></td><td><p>{{มูลค่า}}</p></td><td><p>{{หมายเหตุ}}</p></td></tr>
</tbody></table>
<p>หมายเหตุ ราคา/ชิ้น คือพัสดุรื้อถอนสภาพดี</p>
<p style="text-indent:2.5cm">จึงเรียนมาเพื่อโปรดทราบ</p>
<table><tbody>
<tr><td data-borders="none" style="border:none"><p style="text-align:center">(ลงชื่อ)........................................</p><p style="text-align:center">({{ผู้ส่งคืน}})</p><p style="text-align:center">{{ตำแหน่งผู้ส่งคืน}}</p></td><td data-borders="none" style="border:none"><p style="text-align:center">(ลงชื่อ)........................................</p><p style="text-align:center">({{ผู้ตรวจสอบ}})</p><p style="text-align:center">{{ตำแหน่งผู้ตรวจสอบ}}</p></td><td data-borders="none" style="border:none"><p style="text-align:center">(ลงชื่อ)........................................</p><p style="text-align:center">({{ผู้อนุมัติ}})</p><p style="text-align:center">{{ตำแหน่งผู้อนุมัติ}}</p></td></tr>
</tbody></table>
<table><tbody>
<tr><td data-borders="none" style="border:none"><p><strong>คณะกรรมการได้ตรวจสอบแล้ว มีจำนวนถูกต้อง</strong></p><p>(ลงชื่อ)......................................ตำแหน่ง..........................</p><p>(ลงชื่อ)......................................ตำแหน่ง..........................</p><p>(ลงชื่อ)......................................ตำแหน่ง..........................</p></td><td data-borders="none" style="border:none"><p><strong>พัสดุ {{คลังพัสดุ}}</strong></p><p>ได้รับเข้าบัญชีแล้ว วันที่..............................................</p><p>และจ่ายเข้างาน/WBS…..................................</p><p>(ลงชื่อ)......................................................</p><p>(..............................................................)</p><p>ตำแหน่ง................................................</p></td></tr>
</tbody></table>`),
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
