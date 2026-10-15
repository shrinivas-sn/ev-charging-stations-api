import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import DocsPage from './pages/DocsPage';
import PlaygroundPage from './pages/PlaygroundPage';
import GuidesPage from './pages/GuidesPage';
import StatusPage from './pages/StatusPage';
import NotFoundPage from './pages/NotFoundPage';
import { usePageMeta } from './lib/seo';

export function AppContent() {
  usePageMeta();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas text-ink">
      <Navbar />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/docs" element={<DocsPage />} />
          <Route path="/playground" element={<PlaygroundPage />} />
          <Route path="/guides" element={<GuidesPage />} />
          <Route path="/guides/:id" element={<GuidesPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

export default function App() {
  return <AppContent />;
}
