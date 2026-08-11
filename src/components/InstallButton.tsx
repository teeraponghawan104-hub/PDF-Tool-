import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

export default function InstallButton({ isMobile }: { isMobile?: boolean }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
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

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  // For iOS, there is no beforeinstallprompt, but we can detect it's iOS and show instructions
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
  const showIosInstructions = isIOS && !isInstalled;

  if (!isInstallable && !showIosInstructions) {
    return null;
  }

  if (isMobile) {
    return (
      <div className="md:hidden w-full bg-red-50 border-b-2 border-black p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-red-600" />
          <span className="text-sm font-bold text-black">ติดตั้งแอปพลิเคชัน</span>
        </div>
        {isInstallable ? (
          <button 
            onClick={handleInstallClick}
            className="bg-black text-white px-4 py-1.5 rounded-lg font-bold text-xs"
          >
            ติดตั้ง
          </button>
        ) : (
          <span className="text-xs font-medium text-gray-600 border border-gray-300 rounded px-2 py-1 bg-white">Share &gt; Add to Home Screen</span>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleInstallClick}
      className="hidden md:flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-sm border-2 border-black hover:bg-red-700 transition-colors shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-[1px] hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
    >
      <Download className="w-4 h-4" />
      ติดตั้งแอป
    </button>
  );
}
