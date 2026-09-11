import React from 'react';
import { Link } from 'react-router-dom';
import { 
  FileStack, Scissors, Image as ImageIcon, FileText, 
  Settings, Key, Unlock, Stamp, RotateCcw, ScanSearch, LayoutGrid,
  Hash, PenTool, UserCheck
} from 'lucide-react';

const tools = [
  { id: 'merge', name: 'รวม PDF', desc: 'รวม PDF เข้าด้วยกันในรูปแบบที่คุณต้องการอย่างแม่นยำ', icon: <FileStack className="w-8 h-8 text-white" />, color: 'bg-red-500', path: '/merge' },
  { id: 'split', name: 'แยก PDF', desc: 'แยกหน้า PDF หนึ่งหน้าหรือหลายๆ หน้าให้กลายเป็นเอกสารเดียว', icon: <Scissors className="w-8 h-8 text-white" />, color: 'bg-orange-500', path: '/split' },
  { id: 'organize', name: 'จัดเรียง PDF', desc: 'จัดเรียงลำดับหน้าใหม่ หรือลบหน้าที่คุณไม่ต้องการออก', icon: <LayoutGrid className="w-8 h-8 text-white" />, color: 'bg-teal-500', path: '/organize' },
  { id: 'compress', name: 'บีบอัด PDF', desc: 'ลดขนาดไฟล์ PDF ให้เล็กลงแต่ยังคงคุณภาพไว้ดีที่สุด', icon: <FileText className="w-8 h-8 text-white" />, color: 'bg-green-500', path: '/compress' },
  { id: 'sign', name: 'เซ็นเอกสาร', desc: 'เพิ่มลายเซ็นของคุณลงในไฟล์ PDF วาดหรืออัปโหลดลายเซ็นได้ง่ายๆ', icon: <PenTool className="w-8 h-8 text-white" />, color: 'bg-rose-500', path: '/sign' },
  { id: 'page-numbers', name: 'ใส่เลขหน้า', desc: 'เพิ่มหมายเลขหน้าลงในเอกสาร PDF เลือกตำแหน่งได้ตามต้องการ', icon: <Hash className="w-8 h-8 text-white" />, color: 'bg-cyan-500', path: '/page-numbers' },
  { id: 'analyze', name: 'วิเคราะห์รูปภาพ AI', desc: 'ขับเคลื่อนด้วย Gemini 2.5 Pro วิเคราะห์รูปภาพ สกัดข้อความ และตอบคำถาม', icon: <ScanSearch className="w-8 h-8 text-white" />, color: 'bg-indigo-500', path: '/analyze', badge: 'Gemini 2.5' },
  { id: 'jpg-to-pdf', name: 'JPG เป็น PDF', desc: 'แปลงรูปภาพ JPG เป็น PDF หมุนหรือปรับระยะขอบแบบรวดเร็ว', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-yellow-500', path: '/jpg-to-pdf' },
  { id: 'pdf-to-jpg', name: 'PDF เป็น JPG', desc: 'แปลงแต่ละหน้าเป็น JPG หรือแยกรูปภาพที่อยู่ใน PDF', icon: <ImageIcon className="w-8 h-8 text-white" />, color: 'bg-yellow-500', path: '/pdf-to-jpg' },
  { id: 'rotate', name: 'หมุน PDF', desc: 'หมุน PDF ตามที่คุณต้องการ รองรับหลายไฟล์พร้อมกัน', icon: <RotateCcw className="w-8 h-8 text-white" />, color: 'bg-purple-500', path: '/rotate' },
  { id: 'watermark', name: 'ลายน้ำ', desc: 'ใส่ตัวอักษรหรือรูปภาพเป็นลายน้ำลงในไฟล์ PDF', icon: <Stamp className="w-8 h-8 text-white" />, color: 'bg-blue-500', path: '/watermark' },
  { id: 'unlock', name: 'ปลดล็อก PDF', desc: 'ลบความปลอดภัยในไฟล์เพื่อใช้ประโยชน์ได้อย่างเต็มที่', icon: <Unlock className="w-8 h-8 text-white" />, color: 'bg-gray-600', path: '/unlock' },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 pt-12 pb-24">
      {/* Hero */}
      <div className="text-center mb-16">
        <h1 className="text-4xl md:text-5xl font-display font-black tracking-tight mb-4 text-black">
          เครื่องคิดคำนวณเอกสาร <span className="text-red-600">PDF</span> ให้ง่ายขึ้น
        </h1>
        <p className="text-xl text-gray-600 font-medium max-w-2xl mx-auto">
          ทุกเครื่องมือที่คุณต้องการในการจัดการ PDF ใช้งานง่าย ปลอดภัย และเสร็จสมบูรณ์ในเบราว์เซอร์
        </p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tools.map(tool => {
          if ((tool as any).comingSoon) {
            return (
              <div key={tool.id} className="relative group bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] opacity-70 cursor-not-allowed">
                <div className="absolute top-4 right-4 bg-gray-200 text-gray-700 text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider border border-gray-400">
                  Coming Soon
                </div>
                <div className={`w-14 h-14 ${tool.color} rounded-xl flex items-center justify-center border-2 border-black mb-4`}>
                  {tool.icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-black">{tool.name}</h3>
                <p className="text-sm text-gray-600 font-medium leading-relaxed">{tool.desc}</p>
              </div>
            );
          }

          return (
            <Link 
              key={tool.id} 
              id={`tool-${tool.id}`}
              to={tool.path}
              className="block group bg-white border-2 border-black rounded-2xl p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-14 h-14 ${tool.color} rounded-xl flex items-center justify-center border-2 border-black group-hover:scale-110 transition-transform`}>
                  {tool.icon}
                </div>
                {(tool as any).badge && (
                  <span className="bg-indigo-100 text-indigo-800 text-xs font-black px-2.5 py-1 rounded-full border-2 border-indigo-400 uppercase tracking-wide flex items-center gap-1 shadow-[2px_2px_0px_0px_rgba(99,102,241,0.4)]">
                    ✨ {(tool as any).badge}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-bold mb-2 text-black group-hover:text-red-600 transition-colors">{tool.name}</h3>
              <p className="text-sm text-gray-600 font-medium leading-relaxed">{tool.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
