import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { FileStack, FileText } from 'lucide-react';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#fafafa] text-[#1a1a1a] font-sans">
      {/* Navigation */}
      <nav className="bg-white border-b-2 border-black sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-red-600 rounded flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all">
                <FileStack className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </div>
              <span className="font-display font-black text-xl md:text-2xl tracking-tighter">
                Thiw<span className="text-red-600">pdf</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 font-bold text-sm">
              <Link to="/merge" className="hover:text-red-600 transition">รวม PDF</Link>
              <Link to="/split" className="hover:text-red-600 transition">แยก PDF</Link>
              <Link to="/jpg-to-pdf" className="hover:text-red-600 transition">JPG เป็น PDF</Link>
            </div>
            
            <div className="flex items-center">
              <button className="md:hidden p-2">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-zinc-100 border-t border-gray-200 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-500 font-medium">
          <p>พัฒนาโดย Thiw_Theerapong</p>
        </div>
      </footer>
    </div>
  );
}
