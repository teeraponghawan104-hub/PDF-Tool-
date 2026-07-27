import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import JpgToPdf from './pages/JpgToPdf';
import MergePdf from './pages/MergePdf';
import SplitPdf from './pages/SplitPdf';
import CompressPdf from './pages/CompressPdf';
import PdfToJpg from './pages/PdfToJpg';
import RotatePdf from './pages/RotatePdf';
import WatermarkPdf from './pages/WatermarkPdf';
import UnlockPdf from './pages/UnlockPdf';
import AnalyzeImage from './pages/AnalyzeImage';
import OrganizePdf from './pages/OrganizePdf';
import PageNumbersPdf from './pages/PageNumbersPdf';
import SignPdf from './pages/SignPdf';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="jpg-to-pdf" element={<JpgToPdf />} />
          <Route path="merge" element={<MergePdf />} />
          <Route path="split" element={<SplitPdf />} />
          <Route path="compress" element={<CompressPdf />} />
          <Route path="pdf-to-jpg" element={<PdfToJpg />} />
          <Route path="rotate" element={<RotatePdf />} />
          <Route path="watermark" element={<WatermarkPdf />} />
          <Route path="unlock" element={<UnlockPdf />} />
          <Route path="analyze" element={<AnalyzeImage />} />
          <Route path="organize" element={<OrganizePdf />} />
          <Route path="page-numbers" element={<PageNumbersPdf />} />
          <Route path="sign" element={<SignPdf />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
