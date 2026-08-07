import React, { useState, useEffect } from 'react';
import { getSiteContent, saveSiteContent, SiteCustomContent } from '../backend';

export const AdminEditToolbar = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [content, setContent] = useState<SiteCustomContent>(getSiteContent());

  useEffect(() => {
    // تطبيق التعديلات المحفوظة مسبقاً على النصوص والصور عند تحميل الصفحة
    const saved = getSiteContent();
    
    // تطبيق النصوص
    Object.keys(saved.texts || {}).forEach((key) => {
      const el = document.querySelector(`[data-edit-id="${key}"]`);
      if (el) el.textContent = saved.texts[key];
    });

    // تطبيق الصور
    Object.keys(saved.images || {}).forEach((key) => {
      const el = document.querySelector(`[data-img-id="${key}"]`) as HTMLImageElement;
      if (el) el.src = saved.images[key];
    });
  }, []);

  const handleElementClick = (e: React.MouseEvent) => {
    if (!isEditMode) return;
    const target = e.target as HTMLElement;

    // تعديل النصوص
    if (target.hasAttribute('data-edit-id') || ['H1', 'H2', 'H3', 'P', 'SPAN', 'A'].includes(target.tagName)) {
      e.preventDefault();
      e.stopPropagation();
      let editId = target.getAttribute('data-edit-id');
      if (!editId) {
        editId = 'text_' + Math.random().toString(36).substring(2, 9);
        target.setAttribute('data-edit-id', editId);
      }

      const currentText = target.textContent || '';
      const newText = prompt('تعديل النص:', currentText);
      if (newText !== null) {
        target.textContent = newText;
        const updatedTexts = { ...content.texts, [editId]: newText };
        const newContent = { ...content, texts: updatedTexts };
        setContent(newContent);
        saveSiteContent(newContent);
      }
    }

    // تعديل الصور
    if (target.tagName === 'IMG') {
      e.preventDefault();
      e.stopPropagation();
      let imgId = target.getAttribute('data-img-id');
      if (!imgId) {
        imgId = 'img_' + Math.random().toString(36).substring(2, 9);
        target.setAttribute('data-img-id', imgId);
      }

      const currentSrc = (target as HTMLImageElement).src;
      const newSrc = prompt('أدخل رابط الصورة الجديد:', currentSrc);
      if (newSrc !== null) {
        (target as HTMLImageElement).src = newSrc;
        const updatedImages = { ...content.images, [imgId]: newSrc };
        const newContent = { ...content, images: updatedImages };
        setContent(newContent);
        saveSiteContent(newContent);
      }
    }
  };

  useEffect(() => {
    if (isEditMode) {
      document.addEventListener('click', handleElementClick, true);
    } else {
      document.removeEventListener('click', handleElementClick, true);
    }
    return () => {
      document.removeEventListener('click', handleElementClick, true);
    };
  }, [isEditMode, content]);

  return (
    <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 bg-white/95 backdrop-blur-md p-3 rounded-full shadow-2xl border border-border">
      <button
        onClick={() => setIsEditMode(!isEditMode)}
        className={`px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all shadow-md ${
          isEditMode ? 'bg-rose-600 text-white animate-pulse' : 'bg-warm-900 text-white hover:bg-warm-800'
        }`}
      >
        <span>✏️</span>
        <span>{isEditMode ? 'إنهاء التعديل وحفظ' : 'تعديل الواجهة'}</span>
      </button>
      {isEditMode && (
        <span className="text-xs text-rose-600 font-bold px-2">
          انقر على أي نص أو صورة للتعديل المباشر
        </span>
      )}
    </div>
  );
};
