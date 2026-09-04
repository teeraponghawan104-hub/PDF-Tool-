import React, { useState, useEffect } from 'react';
import { Download, Share, PlusSquare, X, Copy, Check, ExternalLink } from 'lucide-react';

export default function InstallButton({ isMobile }: { isMobile?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Check if app is already installed in standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Detect iOS devices (iPhone, iPad, iPod, including iPadOS desktop mode)
  const isIOS =
    typeof navigator !== 'undefined' &&
    ((/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
      !(window as any).MSStream);

  const isInAppBrowser =
    typeof navigator !== 'undefined' &&
    /Line|FBAN|FBAV|Instagram|Twitter|MicroMessenger/i.test(navigator.userAgent);

  const isChromeIOS =
    typeof navigator !== 'undefined' && /CriOS/i.test(navigator.userAgent);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsInstallable(false);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // If already running in standalone app mode, don't show the install prompt
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isMobile ? (
        <div className="md:hidden w-full bg-red-50 border-b-2 border-black p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <span className="text-sm font-bold text-black block">ติดตั้งแอป Thiwpdf</span>
              <span className="text-xs text-gray-600 block">เปิดเต็มจอ ใช้งานสะดวกรวดเร็ว</span>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="bg-black text-white px-4 py-1.5 rounded-lg font-bold text-xs shrink-0 flex items-center gap-1.5 shadow-sm active:scale-95 transition"
          >
            <Download className="w-3.5 h-3.5" />
            ติดตั้ง
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          className="hidden md:flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm border-2 border-black hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          <Download className="w-4 h-4" />
          ติดตั้งแอป
        </button>
      )}

      {/* iOS Installation Instruction Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border-2 border-black">
            <div className="flex items-start justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <img
                  src="/apple-touch-icon.png"
                  alt="Thiwpdf icon"
                  className="w-12 h-12 rounded-xl shadow-md border border-gray-200 object-cover"
                />
                <div>
                  <h3 className="text-base font-bold text-gray-900">ติดตั้ง Thiwpdf บน iOS</h3>
                  <p className="text-xs text-gray-500">iPhone / iPad</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isInAppBrowser ? (
              <div className="mt-4 space-y-3">
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                  <p className="font-bold mb-1">เปิดในแอปภายนอก (LINE / Facebook)</p>
                  <p>ระบบ iOS ป้องกันไม่ให้ติดตั้งแอปจากเบราว์เซอร์ใน LINE/Facebook กรุณาคัดลอกลิงก์ไปเปิดใน <strong>Safari</strong></p>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 text-white font-bold py-2.5 rounded-xl text-xs shadow-sm hover:bg-red-700 transition"
                >
                  {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'คัดลอกลิงก์แล้ว! นำไปเปิดใน Safari' : 'คัดลอกลิงก์เพื่อเปิดใน Safari'}
                </button>
              </div>
            ) : isChromeIOS ? (
              <div className="mt-4 space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">1</div>
                  <div>
                    <p className="font-semibold text-gray-900">แตะปุ่มตัวเลือก (...)</p>
                    <p className="text-xs text-gray-500 mt-0.5">กดที่จุดสามจุดที่มุมขวาบนหรือล่างของ Chrome</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">2</div>
                  <div>
                    <p className="font-semibold text-gray-900">เลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot;</p>
                    <p className="text-xs text-gray-500 mt-0.5">แตะ <strong>Add to Home Screen</strong> แล้วกดเพิ่ม</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-3.5 text-sm text-gray-700">
                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">แตะปุ่มแชร์ที่ Safari</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      แตะที่ไอคอน <Share className="w-3.5 h-3.5 text-blue-600 inline" /> ที่แถบล่างสุด (หรือบน) ของ Safari
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">เลือก &quot;เพิ่มไปยังหน้าจอโฮม&quot;</p>
                    <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                      เลื่อนลงมาแล้วเลือก <PlusSquare className="w-3.5 h-3.5 text-gray-700 inline" /> <strong>เพิ่มไปยังหน้าจอโฮม (Add to Home Screen)</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">แตะ &quot;เพิ่ม (Add)&quot;</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      แตะ <strong>เพิ่ม</strong> ที่มุมบนขวา แอป Thiwpdf จะไปอยู่บนหน้าจอและเปิดเต็มจอเหมือนแอปทันที
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full rounded-xl bg-black py-2.5 text-sm font-bold text-white hover:bg-gray-800 transition"
            >
              เข้าใจแล้ว
            </button>
          </div>
        </div>
      )}
    </>
  );
}
