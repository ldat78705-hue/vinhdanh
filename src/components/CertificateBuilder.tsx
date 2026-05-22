import { removeBackground, preload } from '@imgly/background-removal';
import React, { useState, useEffect, useRef } from 'react';
import { TemplateConfig, CertificateData, TextKeys, FieldStyleOverride, BatchStudent } from '../types';
import { getTemplates, seedDefaultTemplates, saveTemplate } from '../lib/db';
import { renderCertificateToCanvas } from '../lib/canvas';
import { resizeImageFile } from '../lib/utils';
import { FONT_OPTIONS } from '../lib/constants';
import { Download, Upload, Image as ImageIcon, Eye, EyeOff, Settings2, X, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { motion, AnimatePresence } from 'motion/react';

let _imglyConfig: any = null;

export const CertificateBuilder: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [aiLoadingState, setAiLoadingState] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStatusMessage, setAiStatusMessage] = useState('Hệ thống đang tải bộ xử lý AI (khoảng 100MB)...');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [openStyleField, setOpenStyleField] = useState<TextKeys | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false });

  const toggleSection = (step: number) => {
    setOpenSections(prev => {
       const newState = { 1: false, 2: false, 3: false };
       newState[step as keyof typeof newState] = !prev[step];
       return newState;
    });
  };
  const [batchList, setBatchList] = useState<BatchStudent[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(-1);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchInput, setBatchInput] = useState('');

  useEffect(() => {
    document.fonts.ready.then(() => setFontsLoaded(true));

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
               if (ev.target?.result) {
                  setData(prev => ({ ...prev, avatarDataUrl: ev.target!.result as string, removeAvatarBg: false }));
               }
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const [data, setData] = useState<CertificateData>({
    schoolName: 'TRƯỜNG THCS LIÊN CHÂU',
    title: 'VINH DANH EM',
    studentName: 'HỌ VÀ TÊN',
    className: 'LỚP:',
    achievement: 'ĐẠT DANH HIỆU HỌC SINH GIỎI CẤP XÃ',
    date: 'Năm học: 2025 - 2026',
    principalName: '',
    avatarScale: 1,
    avatarOffsetX: 0,
    avatarOffsetY: 0,
    visibleFields: {
      schoolName: true,
      title: true,
      studentName: true,
      className: true,
      achievement: true,
      date: true,
      principalName: false
    },
    styleOverrides: {}
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [dragStartPos, setDragStartPos] = useState<{x: number, y: number} | null>(null);
  const [editingField, setEditingField] = useState<TextKeys | null>(null);

  useEffect(() => {
    // Load local storage settings
    const savedData = localStorage.getItem('vinhdanh_saved_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (parsed && typeof parsed === 'object') {
           setData(prev => ({ ...prev, ...parsed }));
        }
      } catch (e) { console.error('Error loading saved data', e); }
    } else {
      const cachedSchool = localStorage.getItem('schoolName');
      const cachedPrincipal = localStorage.getItem('principalName');
      if (cachedSchool || cachedPrincipal) {
        setData(prev => ({
          ...prev,
          schoolName: cachedSchool || prev.schoolName,
          principalName: cachedPrincipal || prev.principalName
        }));
      }
    }

    const init = async () => {
      await seedDefaultTemplates();
      const docs = await getTemplates();
      setTemplates(docs);
      if (docs.length > 0) setSelectedTemplateId(docs[0].id);
    };
    init();
  }, []);

  // Update canvas on data or template change
  useEffect(() => {
    const template = templates.find(t => t.id === selectedTemplateId);
    if (template && canvasRef.current) {
      // Cast the defined config keys correctly for the rendering function
      renderCertificateToCanvas(canvasRef.current, template, data as any, data.avatarDataUrl);
    }
  }, [data, selectedTemplateId, templates, fontsLoaded]);

  const handleDataChange = (field: keyof CertificateData, value: string) => {
    setData(prev => {
      const next = { ...prev, [field]: value };
      if (field === 'schoolName') localStorage.setItem('schoolName', value);
      if (field === 'principalName') localStorage.setItem('principalName', value);
      return next;
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await resizeImageFile(file, 800, 800); // 800px max for avatar
      setData(prev => ({ ...prev, avatarDataUrl: dataUrl }));
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: 'logoDataUrl' | 'signatureDataUrl') => {
    const file = e.target.files?.[0];
    if (file) {
      const dataUrl = await resizeImageFile(file, 800, 800);
      setData(prev => ({ ...prev, [field]: dataUrl }));
    }
  };

  const handleToggleVisibility = (field: TextKeys) => {
    setData(prev => ({
      ...prev,
      visibleFields: {
        ...prev.visibleFields,
        [field]: !prev.visibleFields[field]
      }
    }));
  };

  const handleAvatarSetting = (field: 'avatarScale' | 'avatarOffsetX' | 'avatarOffsetY', value: number) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleStyleOverride = (field: TextKeys, prop: keyof FieldStyleOverride, value: any) => {
    setData(prev => ({
      ...prev,
      styleOverrides: {
        ...prev.styleOverrides,
        [field]: {
          ...(prev.styleOverrides?.[field] || {}),
          [prop]: value
        }
      }
    }));
  };

  const currentTemplate = templates.find(t => t.id === selectedTemplateId);

  const [draggingItem, setDraggingItem] = useState<'avatar' | 'logo' | 'signature' | TextKeys | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);

  const initAI = async () => {
    if (aiLoadingState === 'ready') return;
    
    try {
      setAiLoadingState('loading');
      setAiProgress(0);
      setAiStatusMessage('Đang kết nối hệ thống AI...');

      _imglyConfig = {
         model: "medium", // Sử dụng model thông minh nhất (rmbg-1.4)
         device: "cpu",  // Ép buộc dùng WebAssembly CPU để không gây sập WebGL trên điện thoại
         progress: (key: string, current: number, total: number) => {
           if (key.includes('fetch')) {
             const p = Math.round((current / total) * 100);
             setAiProgress(p);
             setAiStatusMessage(`Đang tải lõi xử lý AI (${p}%)`);
           }
         }
      };

      await preload(_imglyConfig);
      
      setAiLoadingState('ready');
    } catch (err) {
      console.error("AI Initialization error:", err);
      setAiLoadingState('idle');
      alert("Không thể tải hệ thống AI. Vui lòng kiểm tra lại kết nối mạng!");
    }
  };

  const handleAIBgRemoval = async () => {
    if (!data.avatarDataUrl || !_imglyConfig) return;
    setIsRemovingBg(true);
    try {
      const blob = await removeBackground(data.avatarDataUrl, _imglyConfig);
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        setData(prev => ({
          ...prev,
          avatarDataUrl: reader.result as string,
          removeAvatarBg: false
        }));
        setIsRemovingBg(false);
      };
    } catch(e) {
      console.error(e);
      alert('Có lỗi trong quá trình xử lý xóa nền. Vui lòng thử lại!');
      setIsRemovingBg(false);
    }
  };

  const handleParseBatch = () => {
    const lines = batchInput.split('\n').map(l => l.trim()).filter(Boolean);
    const parsed: BatchStudent[] = lines.map(line => {
        // Support both tab-separated (Excel paste) and comma-separated
        const parts = line.includes('\t') ? line.split('\t') : line.split(',');
        return {
            studentName: (parts[0] || '').trim(),
            className: (parts[1] || '').trim(),
            achievement: (parts[2] || '').trim()
        };
    }).filter(s => s.studentName.length > 0);
    
    if (parsed.length === 0) {
      alert('Không tìm thấy dữ liệu hợp lệ. Hãy đảm bảo mỗi dòng có: Tên HS [Tab] Lớp [Tab] Thành tích');
      return;
    }
    
    setBatchList(parsed);
    setCurrentBatchIndex(0);
    setShowBatchModal(false);
    setBatchInput('');
    
    // Auto-open Section 3 so teacher sees the student info
    setOpenSections({ 1: false, 2: false, 3: true });
    
    setData(prev => ({
        ...prev,
        studentName: parsed[0].studentName,
        className: parsed[0].className,
        achievement: parsed[0].achievement,
        avatarDataUrl: undefined,
        avatarOverride: undefined,
        removeAvatarBg: false
    }));
  };

  const handleNextBatch = async () => {
    // Download current certificate first
    handleDownload();
    
    // Small delay to ensure download completes
    await new Promise(r => setTimeout(r, 300));
    
    if (currentBatchIndex < batchList.length - 1) {
        const nextIdx = currentBatchIndex + 1;
        setCurrentBatchIndex(nextIdx);
        const nextStudent = batchList[nextIdx];
        setData(prev => ({
            ...prev,
            studentName: nextStudent.studentName,
            className: nextStudent.className,
            achievement: nextStudent.achievement,
            avatarDataUrl: undefined,
            avatarOverride: undefined,
            removeAvatarBg: false
        }));
    } else {
        alert(`🎉 Đã hoàn thành toàn bộ ${batchList.length} chứng nhận!\nTất cả ảnh đã được tải về máy.`);
        setCurrentBatchIndex(-1);
        setBatchList([]);
    }
  };

  const handleCancelBatch = () => {
    if (window.confirm('Bạn có chắc muốn hủy chế độ tạo hàng loạt? Các chứng nhận đã tải sẽ không bị ảnh hưởng.')) {
      setCurrentBatchIndex(-1);
      setBatchList([]);
    }
  };

  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const point = getCanvasPoint(e);
    if (!point || !currentTemplate) return;

    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStartPos({ x: e.clientX, y: e.clientY });

    if (!currentTemplate.hiddenFields?.includes('avatar') && currentTemplate.avatar) {
      const override = data.avatarOverride || {};
      const ax = override.x ?? currentTemplate.avatar.x;
      const ay = override.y ?? currentTemplate.avatar.y;
      const rad = override.radius ?? currentTemplate.avatar.radius;
      if (point.x >= ax - rad && point.x <= ax + rad && point.y >= ay - rad && point.y <= ay + rad) {
         setDraggingItem('avatar');
         return;
      }
    }

    if (data.signatureDataUrl && data.showSignature !== false) {
      const defaultSig = currentTemplate.signature || { x: currentTemplate.width / 2 + 200, y: currentTemplate.height - 150, width: 200, height: 100 };
      const override = data.signatureOverride || {};
      const config = { ...defaultSig, ...override };
      if (
        point.x >= config.x - config.width / 2 && point.x <= config.x + config.width / 2 &&
        point.y >= config.y - config.height / 2 && point.y <= config.y + config.height / 2
      ) {
        setDraggingItem('signature');
        return;
      }
    }

    if (data.logoDataUrl && data.showLogo !== false) {
      const defaultLogo = currentTemplate.logo || { x: currentTemplate.width / 2 - 200, y: 150, width: 150, height: 150 };
      const override = data.logoOverride || {};
      const config = { ...defaultLogo, ...override };
      if (
        point.x >= config.x - config.width / 2 && point.x <= config.x + config.width / 2 &&
        point.y >= config.y - config.height / 2 && point.y <= config.y + config.height / 2
      ) {
        setDraggingItem('logo');
        return;
      }
    }

    // Text intersection
    for (const key of Object.keys(currentTemplate.texts) as TextKeys[]) {
      if (currentTemplate.hiddenFields?.includes(key) || data.visibleFields[key] === false) continue;
      if (!data[key]) continue;

      const baseConfig = currentTemplate.texts[key];
      const overrides = data.styleOverrides?.[key] || {};
      const x = overrides.x ?? baseConfig.x;
      const y = overrides.y ?? baseConfig.y;
      const fontSize = overrides.fontSize ?? baseConfig.fontSize;
      
      // Approximation of bounding box
      const width = 600; // rough width
      const height = fontSize * 1.5;
      
      let boxX = x;
      if (baseConfig.align === 'center') boxX = x - width / 2;
      else if (baseConfig.align === 'right') boxX = x - width;
      
      const boxY = y - height / 2;

      if (point.x >= boxX && point.x <= boxX + width && point.y >= boxY && point.y <= boxY + height) {
        setDraggingItem(key);
        return;
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingItem) return;
    const point = getCanvasPoint(e);
    if (!point) return;

    if (draggingItem === 'avatar') {
      // Di chuyển ảnh học sinh vỡ khung nên tính năng này bị vô hiệu hóa
    } else if (draggingItem === 'logo') {
      setData(prev => ({ ...prev, logoOverride: { ...(prev.logoOverride || {}), x: point.x, y: point.y } }));
    } else if (draggingItem === 'signature') {
      setData(prev => ({ ...prev, signatureOverride: { ...(prev.signatureOverride || {}), x: point.x, y: point.y } }));
    } else {
      // Text dragging
      handleStyleOverride(draggingItem as TextKeys, 'x', point.x);
      handleStyleOverride(draggingItem as TextKeys, 'y', point.y);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (draggingItem && dragStartPos) {
       const dx = e.clientX - dragStartPos.x;
       const dy = e.clientY - dragStartPos.y;
       const dist = Math.sqrt(dx*dx + dy*dy);
       
       if (dist < 5) {
          if (draggingItem === 'avatar') {
             avatarInputRef.current?.click();
          } else if (draggingItem !== 'logo' && draggingItem !== 'signature') {
             setEditingField(draggingItem as TextKeys);
          }
       }
    }
    setDraggingItem(null);
    setDragStartPos(null);
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDraggingItem(null);
    setDragStartPos(null);
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL('image/png', 1.0);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Chung-Nhan-${data.studentName.replace(/\s+/g, '-').toLowerCase() || 'Hoc-Sinh'}.png`;
    a.click();
    
    // Silently save state
    localStorage.setItem('vinhdanh_saved_data', JSON.stringify(data));
  };
  
  const handleDownloadPDF = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const imgData = canvas.toDataURL('image/jpeg', 0.98);
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasRatio = canvas.width / canvas.height;
    const pdfRatio = pdfWidth / pdfHeight;
    
    let finalW = pdfWidth;
    let finalH = pdfHeight;
    
    if (canvasRatio > pdfRatio) {
       finalH = pdfWidth / canvasRatio;
    } else {
       finalW = pdfHeight * canvasRatio;
    }
    
    const x = (pdfWidth - finalW) / 2;
    const y = (pdfHeight - finalH) / 2;
    
    pdf.addImage(imgData, 'JPEG', x, y, finalW, finalH);
    pdf.save(`Chung-Nhan-${data.studentName.replace(/\s+/g, '-').toLowerCase() || 'Hoc-Sinh'}.pdf`);
    
    localStorage.setItem('vinhdanh_saved_data', JSON.stringify(data));
  };
  
  const handleSaveState = async () => {
    localStorage.setItem('vinhdanh_saved_data', JSON.stringify(data));
    
    const name = window.prompt('Nhập tên mẫu để lưu vào danh sách (để trống nếu chỉ muốn lưu tạm thời):', 'Mẫu mới ' + new Date().toLocaleTimeString());
    
    if (name) {
      if (!currentTemplate) return;
      
      const newTemplate: TemplateConfig = {
        ...currentTemplate,
        id: 'custom-' + Date.now(),
        name: name,
        texts: Object.keys(currentTemplate.texts).reduce((acc, key) => {
          const k = key as TextKeys;
          const override = data.styleOverrides?.[k] || {};
          acc[k] = {
            ...currentTemplate.texts[k],
            ...override
          };
          return acc;
        }, {} as Record<TextKeys, import('../types').TextConfig>),
        logo: data.logoDataUrl ? { ...(currentTemplate.logo || {x:200, y:150, width:150, height:150}), ...data.logoOverride } : currentTemplate.logo,
        signature: data.signatureDataUrl ? { ...(currentTemplate.signature || {x:1200, y:850, width:200, height:100}), ...data.signatureOverride } : currentTemplate.signature,
        avatar: { ...(currentTemplate.avatar || {x:currentTemplate.width/2, y:400, radius:150, shape:'circle'}), ...data.avatarOverride }
      };
      
      await saveTemplate(newTemplate);
      const docs = await getTemplates();
      setTemplates(docs);
      setSelectedTemplateId(newTemplate.id);
      
      alert(`Đã lưu mẫu "${name}" thành công!`);
    } else {
      alert('Đã lưu trạng thái hiện tại! Lần sau mở web sẽ tự động khôi phục.');
    }
  };

  const renderInput = (label: string, field: TextKeys, placeholder? : string, isTextArea?: boolean) => {
    if (currentTemplate?.hiddenFields?.includes(field)) return null;

    const isVisible = data.visibleFields[field];
    const isStyleOpen = openStyleField === field;
    const baseConfig = currentTemplate?.texts[field];
    const override = data.styleOverrides?.[field] || {};

    const currentFont = override.fontFamily || baseConfig?.fontFamily || 'sans-serif';
    const currentSize = override.fontSize || baseConfig?.fontSize || 40;
    const currentColor = override.color || baseConfig?.color || '#000000';

    return (
      <div className={`transition-opacity ${!isVisible ? 'opacity-50' : 'opacity-100'} bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-3`}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold">{label}</label>
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => setOpenStyleField(isStyleOpen ? null : field)}
              className={`text-slate-400 hover:text-blue-600 transition p-1.5 rounded-lg ${isStyleOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-slate-100'}`}
              title="Chỉnh sửa font chữ"
              disabled={!isVisible}
            >
              <Settings2 size={16} />
            </button>
            <button 
              type="button"
              onClick={() => handleToggleVisibility(field)}
              className="text-slate-400 hover:text-blue-600 transition p-1.5 rounded-lg hover:bg-slate-100"
              title={isVisible ? "Ẩn thông tin này trên ảnh" : "Hiện thông tin này trên ảnh"}
            >
              {isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
          </div>
        </div>

        {isStyleOpen && isVisible && (
          <div className="mb-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-3 relative">
            <button onClick={() => setOpenStyleField(null)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"><X size={14}/></button>
            <div className="grid grid-cols-2 gap-2 pr-6">
              <div>
                <label className="block text-slate-500 mb-1">Font chữ</label>
                <select 
                  className="w-full border border-slate-300 rounded p-1.5 bg-white"
                  value={currentFont}
                  onChange={e => handleStyleOverride(field, 'fontFamily', e.target.value)}
                >
                  {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                   <label className="block text-slate-500 mb-1">Cỡ (px)</label>
                   <input type="number" className="w-full border border-slate-300 rounded p-1.5 bg-white"
                     value={currentSize} onChange={e => handleStyleOverride(field, 'fontSize', Number(e.target.value))} />
                </div>
                <div className="flex-1">
                   <label className="block text-slate-500 mb-1">Màu</label>
                   <input type="color" className="w-full border border-slate-300 rounded p-0 h-[30px] bg-white cursor-pointer"
                     value={currentColor} onChange={e => handleStyleOverride(field, 'color', e.target.value)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {isTextArea ? (
          <textarea rows={2} className="w-full border-b border-slate-200 bg-slate-50 rounded-md p-2.5 outline-none transition line-clamp-3 resize-none focus:bg-white focus:ring-2 focus:ring-blue-100" 
            value={data[field]} placeholder={placeholder} onChange={e => handleDataChange(field, e.target.value)} disabled={!isVisible} />
        ) : (
          <>
            <input type="text" list={`${field}-suggestions`} className="w-full border-b border-slate-200 bg-slate-50 rounded-md p-2.5 outline-none transition focus:bg-white focus:ring-2 focus:ring-blue-100" 
              placeholder={placeholder} value={data[field] as string} onChange={e => handleDataChange(field, e.target.value)} disabled={!isVisible} />
            {field === 'achievement' && (
              <datalist id={`${field}-suggestions`}>
                <option value="ĐẠT DANH HIỆU HỌC SINH GIỎI CẤP TRƯỜNG" />
                <option value="ĐẠT DANH HIỆU HỌC SINH GIỎI CẤP HUYỆN" />
                <option value="ĐẠT DANH HIỆU HỌC SINH TIÊN TIẾN" />
                <option value="ĐẠT DANH HIỆU CHÁU NGOAN BÁC HỒ" />
                <option value="CÓ THÀNH TÍCH XUẤT SẮC TRONG PHONG TRÀO THI ĐUA" />
              </datalist>
            )}
            {field === 'title' && (
              <datalist id={`${field}-suggestions`}>
                <option value="VINH DANH EM" />
                <option value="GIẤY KHEN" />
                <option value="BẰNG KHEN" />
                <option value="CHỨNG NHẬN" />
              </datalist>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row w-full lg:h-full text-slate-800 bg-slate-50">
       
       {/* Left Sidebar - Controls */}
       <div className="w-full lg:w-96 bg-white border-r border-slate-200 flex flex-col order-2 lg:order-1 lg:h-full z-20">
          <div className="p-3 sm:p-6 pb-3 border-b border-slate-100 z-20 bg-white sticky top-0 lg:relative">
                          <div className="flex items-center justify-between mb-2">
               <h2 className="text-xl font-bold text-slate-800">Tạo Chứng Nhận</h2>
               <button onClick={() => setShowBatchModal(true)} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition">
                 <Users size={14} /> Danh sách
               </button>
             </div>
             
             {currentBatchIndex >= 0 && (
               <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-sm text-green-900 shadow-sm mt-3">
                 <div className="font-bold mb-1">Chế độ tạo hàng loạt: Em {currentBatchIndex + 1} / {batchList.length}</div>
                 <div className="opacity-90">Đang tạo cho: <b className="text-green-800">{batchList[currentBatchIndex].studentName}</b></div>
               </div>
             )}
          </div>
          
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 relative lg:h-0">
             <div className="space-y-4">
               {/* Section 1: Template */}
               <section className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                 <button onClick={() => toggleSection(1)} className={`w-full flex items-center justify-between p-4 transition ${openSections[1] ? 'bg-blue-50/50 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}>
                   <h3 className={`text-sm font-bold uppercase tracking-wider ${openSections[1] ? 'text-blue-700' : 'text-slate-600'}`}>1. Chọn mẫu chứng nhận</h3>
                   <span className="text-slate-400">{openSections[1] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                 </button>
                 <AnimatePresence initial={false}>
                 {openSections[1] && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     transition={{ duration: 0.2 }}
                     className="overflow-hidden"
                   >
                    <div className="p-4 space-y-4 bg-white border-b border-slate-100">
                      <div className="grid grid-cols-2 gap-3">
                        {templates.map(t => (
                          <motion.div 
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            key={t.id}
                           onClick={() => {
                             setSelectedTemplateId(t.id);
                             setData(prev => ({ ...prev, styleOverrides: {} }));
                           }}
                           className={`border-2 rounded-xl overflow-hidden cursor-pointer transition ${selectedTemplateId === t.id ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 hover:border-slate-300'}`}
                         >
                           <img src={t.backgroundDataUrl} alt={t.name} className="w-full h-[100px] object-cover pointer-events-none" />
                            <div className="p-2 text-xs font-medium text-center bg-slate-50 pointer-events-none">{t.name}</div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                   </motion.div>
                 )}
                 </AnimatePresence>
               </section>

               {/* Section 2: Config */}
               <section className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                 <button onClick={() => toggleSection(2)} className={`w-full flex items-center justify-between p-4 transition ${openSections[2] ? 'bg-blue-50/50 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}>
                   <h3 className={`text-sm font-bold uppercase tracking-wider ${openSections[2] ? 'text-blue-700' : 'text-slate-600'}`}>2. Thông tin tổ chức</h3>
                   <span className="text-slate-400">{openSections[2] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                 </button>
                 <AnimatePresence initial={false}>
                 {openSections[2] && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     transition={{ duration: 0.2 }}
                     className="overflow-hidden"
                   >
                    <div className="p-4 space-y-4 bg-white border-b border-slate-100">
                      {renderInput('Tên Trường / Tổ chức', 'schoolName')}
                 {renderInput('Người đại diện (Hiệu trưởng)', 'principalName', '', true)}
                     <div className="grid grid-cols-2 gap-3 mt-4">
                     {currentTemplate?.hiddenFields?.includes('logo') ? <div /> : (
                     <div>
                        <label className="block text-sm font-medium mb-1 flex justify-between">
                          <span>Logo / Biểu trưng</span>
                          <div className="flex gap-2">
                            {data.logoDataUrl && (
                               <button onClick={() => setData(prev => ({ ...prev, logoDataUrl: undefined, logoOverride: undefined }))} className="text-red-400 hover:text-red-600 transition" title="Xóa Logo">
                                 <X size={16} />
                               </button>
                            )}
                            {data.logoDataUrl && (
                               <button onClick={() => setData(prev => ({ ...prev, showLogo: prev.showLogo === false ? true : false }))} className="text-slate-400 hover:text-blue-600 transition" title="Ẩn/Hiện Logo">
                                 {(data as any).showLogo === false ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                            )}
                          </div>
                        </label>
                        <label className="border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-500 transition relative overflow-hidden h-24">
                          {data.logoDataUrl ? (
                             <>
                              <img src={data.logoDataUrl} className={`max-w-full max-h-full object-contain z-10 transition ${data.showLogo === false ? 'opacity-30' : 'opacity-100'}`} />
                             </>
                          ) : (
                             <>
                               <ImageIcon size={20} className="mb-1 text-slate-400" />
                               <span className="text-xs font-medium text-center">Tải lên Logo</span>
                             </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'logoDataUrl')} />
                        </label>
                         {data.logoDataUrl && (
                           <div className="mt-2 space-y-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Kích thước: </span>
                                <input type="range" min="50" max="800" step="10" 
                                  value={data.logoOverride?.width || currentTemplate?.logo?.width || 150}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setData(prev => ({ 
                                      ...prev, 
                                      logoOverride: { ...(prev.logoOverride || {}), width: val } 
                                    }))
                                  }}
                                  className="flex-1 accent-blue-600" 
                                />
                             </div>
                             <label className="flex items-center gap-2 cursor-pointer select-none">
                               <input type="checkbox" checked={data.removeLogoBg || false} onChange={e => setData(prev => ({...prev, removeLogoBg: e.target.checked}))} className="accent-blue-600 rounded" />
                               <span className="text-xs text-slate-600">Xóa nền trắng</span>
                             </label>
                           </div>
                        )}
                     </div>
                     )}
                     
                     {currentTemplate?.hiddenFields?.includes('signature') ? <div /> : (
                     <div>
                        <label className="block text-sm font-medium mb-1 flex justify-between">
                          <span>Chữ ký / Mộc</span>
                          <div className="flex gap-2">
                            {data.signatureDataUrl && (
                               <button onClick={() => setData(prev => ({ ...prev, signatureDataUrl: undefined, signatureOverride: undefined }))} className="text-red-400 hover:text-red-600 transition" title="Xóa Chữ ký">
                                 <X size={16} />
                               </button>
                            )}
                            {data.signatureDataUrl && (
                               <button onClick={() => setData(prev => ({ ...prev, showSignature: prev.showSignature === false ? true : false }))} className="text-slate-400 hover:text-blue-600 transition" title="Ẩn/Hiện Chữ ký">
                                 {(data as any).showSignature === false ? <EyeOff size={16} /> : <Eye size={16} />}
                               </button>
                            )}
                          </div>
                        </label>
                        <label className="border-2 border-dashed border-slate-300 rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-500 transition relative overflow-hidden h-24">
                          {data.signatureDataUrl ? (
                             <>
                              <img src={data.signatureDataUrl} className={`max-w-full max-h-full object-contain z-10 transition ${data.showSignature === false ? 'opacity-30' : 'opacity-100'}`} />
                             </>
                          ) : (
                             <>
                               <ImageIcon size={20} className="mb-1 text-slate-400" />
                               <span className="text-xs font-medium text-center">Tải lên Chữ ký</span>
                             </>
                          )}
                          <input type="file" className="hidden" accept="image/*" onChange={e => handleImageUpload(e, 'signatureDataUrl')} />
                        </label>
                         {data.signatureDataUrl && (
                           <div className="mt-2 space-y-2">
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400">Kích thước: </span>
                                <input type="range" min="50" max="800" step="10" 
                                  value={data.signatureOverride?.width || currentTemplate?.signature?.width || 200}
                                  onChange={e => {
                                    const val = Number(e.target.value);
                                    setData(prev => ({ 
                                      ...prev, 
                                      signatureOverride: { ...(prev.signatureOverride || {}), width: val } 
                                    }))
                                  }}
                                  className="flex-1 accent-blue-600" 
                                />
                             </div>
                             <label className="flex items-center gap-2 cursor-pointer select-none">
                               <input type="checkbox" checked={data.removeSignatureBg || false} onChange={e => setData(prev => ({...prev, removeSignatureBg: e.target.checked}))} className="accent-blue-600 rounded" />
                               <span className="text-xs text-slate-600">Xóa nền trắng</span>
                             </label>
                           </div>
                        )}
                     </div>
                     )}
                     </div>
                    </div>
                   </motion.div>
                 )}
                 </AnimatePresence>
               </section>
               {/* Section 3: Student */}
               <section className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300">
                 <button onClick={() => toggleSection(3)} className={`w-full flex items-center justify-between p-4 transition ${openSections[3] ? 'bg-blue-50/50 border-b border-slate-200' : 'bg-white hover:bg-slate-50'}`}>
                   <h3 className={`text-sm font-bold uppercase tracking-wider ${openSections[3] ? 'text-blue-700' : 'text-slate-600'}`}>3. Thông tin vinh danh</h3>
                   <span className="text-slate-400">{openSections[3] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                 </button>
                 <AnimatePresence initial={false}>
                 {openSections[3] && (
                   <motion.div
                     initial={{ height: 0, opacity: 0 }}
                     animate={{ height: 'auto', opacity: 1 }}
                     exit={{ height: 0, opacity: 0 }}
                     transition={{ duration: 0.2 }}
                     className="overflow-hidden"
                   >
                    <div className="p-4 space-y-4 bg-white border-b border-slate-100">
                      {!currentTemplate?.hiddenFields?.includes('avatar') && (
                 <div>
                    <label className="block text-sm font-medium mb-1 flex justify-between">
                      <span>Ảnh học sinh (Avatar)</span>
                    </label>
                    <label className="border-2 border-dashed border-slate-300 rounded-lg p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-500 transition group relative overflow-hidden">
                      {data.avatarDataUrl ? (
                         <>
                          <img src={data.avatarDataUrl} className="absolute inset-0 w-full h-full object-contain opacity-50 blur-sm" />
                          <img src={data.avatarDataUrl} className="w-20 h-20 rounded-full border-2 border-white shadow-lg object-cover z-10" />
                          <span className="text-xs font-medium mt-2 z-10 bg-white/80 px-2 py-1 rounded shadow">Đổi ảnh khác</span>
                         </>
                      ) : (
                         <>
                           <ImageIcon size={28} className="mb-2 text-slate-400 group-hover:text-blue-500 transition" />
                           <span className="text-sm font-medium">Tới / Chọn ảnh</span>
                         </>
                      )}
                      
                      <input ref={avatarInputRef} type="file" className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                    </label>
                 </div>
                 )}

                 {!currentTemplate?.hiddenFields?.includes('avatar') && data.avatarDataUrl && (
                   <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                     <p className="text-xs font-semibold mb-3 text-slate-600 flex items-center gap-2"><ImageIcon size={14} /> Chỉnh sửa ảnh thẻ</p>
                     
                     <div className="space-y-3">
                       <div className="flex items-center gap-3">
                         <label className="text-xs w-16 text-slate-500">Thu phóng</label>
                         <input type="range" min="0.1" max="3" step="0.05" value={data.avatarScale} 
                           onChange={e => handleAvatarSetting('avatarScale', parseFloat(e.target.value))} className="flex-1 accent-blue-600" />
                         <span className="text-xs w-8 text-right font-mono">{Math.round(data.avatarScale * 100)}%</span>
                       </div>
                       
                       <div className="flex items-center gap-3">
                         <label className="text-xs w-16 text-slate-500">Sang ngang</label>
                         <input type="range" min="-300" max="300" step="1" value={data.avatarOffsetX} 
                           onChange={e => handleAvatarSetting('avatarOffsetX', parseFloat(e.target.value))} className="flex-1 accent-blue-600" />
                         <button onClick={() => handleAvatarSetting('avatarOffsetX', 0)} className="text-xs text-blue-600 hover:underline w-8 text-right">Reset</button>
                       </div>
                       
                       <div className="flex items-center gap-3">
                         <label className="text-xs w-16 text-slate-500">Lên xuống</label>
                         <input type="range" min="-300" max="300" step="1" value={data.avatarOffsetY} 
                           onChange={e => handleAvatarSetting('avatarOffsetY', parseFloat(e.target.value))} className="flex-1 accent-blue-600" />
                         <button onClick={() => handleAvatarSetting('avatarOffsetY', 0)} className="text-xs text-blue-600 hover:underline w-8 text-right">Reset</button>
                       </div>

                       <div className="mt-4 pt-4 border-t border-slate-200">
                          {aiLoadingState === 'idle' ? (
                             <button onClick={initAI} className="w-full py-2 px-3 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold text-sm hover:bg-indigo-100 transition shadow-sm flex flex-col items-center justify-center gap-1">
                                <span className="flex items-center gap-2">✨ Khởi tạo AI Xóa Nền</span>
                                <span className="text-[10px] font-normal opacity-80">(Tải công cụ xử lý ~100MB lần đầu)</span>
                             </button>
                          ) : aiLoadingState === 'loading' ? (
                             <div className="bg-slate-100 rounded-lg p-3 text-center border border-slate-200 shadow-inner">
                                <p className="text-xs font-semibold text-slate-700 mb-2">{aiStatusMessage}</p>
                                <div className="w-full bg-slate-300 rounded-full h-2 mb-2 overflow-hidden">
                                   <div className="bg-indigo-600 h-full rounded-full transition-all duration-300" style={{ width: `${aiProgress}%` }}></div>
                                </div>
                                <p className="text-[10px] text-orange-600 font-medium">Vui lòng KHÔNG ĐÓNG trình duyệt lúc này...</p>
                             </div>
                          ) : (
                             <button 
                               onClick={handleAIBgRemoval} 
                               disabled={isRemovingBg}
                               className={`w-full py-2 px-3 rounded-lg flex items-center justify-center gap-2 font-bold text-sm transition shadow-sm ${
                                 isRemovingBg 
                                   ? 'bg-slate-200 text-slate-500 cursor-wait' 
                                   : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-md hover:opacity-90 active:scale-95'
                               }`}
                             >
                               {isRemovingBg ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Đang xử lý AI...
                                  </>
                               ) : (
                                  <>✨ Xóa phông bằng AI (Đã sẵn sàng)</>
                               )}
                             </button>
                          )}
                          <p className="text-[10px] text-slate-400 mt-2 text-center">Xử lý 100% trên thiết bị của bạn, bảo mật tuyệt đối.</p>
                       </div>
                     </div>
                   </div>
                 )}
                 {renderInput('Chủ đề vinh danh', 'title')}
                 {renderInput('Họ và tên học sinh', 'studentName', 'Ví dụ: NGUYỄN VĂN A')}
                 
                 <div className="grid grid-cols-2 gap-3">
                    {renderInput('Lớp', 'className')}
                    {renderInput('Ngày cấp', 'date')}
                 </div>

                 {renderInput('Thành tích / Nội dung', 'achievement', '', true)}
                    </div>
                  </motion.div>
                 )}
                 </AnimatePresence>
               </section>
            </div>
          </div>
       </div>

       {/* Right sidebar - Live Preview */}
       <div className="w-full lg:flex-1 bg-slate-100 flex flex-col p-2 sm:p-4 md:p-8 relative h-[35vh] min-h-[280px] lg:h-full lg:min-h-0 overflow-hidden order-1 lg:order-2 sticky top-0 z-30 border-b border-slate-200 lg:border-b-0 lg:shadow-none shadow-md">
           <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-6 shrink-0 gap-2 sm:gap-4">
             <div className="hidden sm:block">
                <h2 className="text-lg md:text-2xl font-bold text-slate-800">Live Preview</h2>
                <p className="text-slate-500 text-xs md:text-sm">Hiển thị trực tiếp kết quả. Resize tự động theo màn hình.</p>
             </div>
             
             <div className="flex gap-2 w-full sm:w-auto">
               <button 
                 onClick={() => {
                   if (window.confirm('Bạn có chắc muốn khôi phục mọi cài đặt về mặc định của mẫu này?')) {
                     setData(prev => ({ ...prev, styleOverrides: {}, avatarOverride: undefined, logoOverride: undefined, signatureOverride: undefined }));
                   }
                 }}
                 className="bg-white hover:bg-slate-50 text-slate-600 px-2 py-1.5 md:px-3 md:py-3 rounded md:rounded-xl font-medium transition active:scale-95 flex-1 sm:flex-none justify-center text-xs md:text-base border border-slate-300"
               >
                 Khôi phục
               </button>
               <button 
                 onClick={handleSaveState}
                 className="bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 md:px-4 md:py-3 rounded md:rounded-xl font-bold transition active:scale-95 flex-1 sm:flex-none justify-center text-xs md:text-base border border-slate-300"
               >
                 Lưu Mẫu
               </button>
               {currentBatchIndex >= 0 ? (
                  <button onClick={handleNextBatch} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-3 py-1.5 md:px-6 md:py-2.5 rounded md:rounded-xl font-bold flex items-center justify-center gap-1 sm:gap-2 shadow-lg transition active:scale-95 text-xs md:text-base flex-1">
                    <Download size={14} className="sm:w-[18px] sm:h-[18px]" />
                    <span>Lưu & Tới</span>
                  </button>
               ) : (
                  <div className="flex gap-2 flex-1 sm:flex-none">
                    <button onClick={handleDownload} className="flex-1 sm:flex-none justify-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-2 py-1.5 md:px-4 md:py-3 rounded md:rounded-xl font-bold shadow-md md:shadow-lg flex items-center gap-1 md:gap-2 transition active:scale-95 text-xs md:text-base border border-blue-500">
                      <Download size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Tải Ảnh</span> PNG
                    </button>
                    <button onClick={handleDownloadPDF} className="flex-1 sm:flex-none justify-center bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white px-2 py-1.5 md:px-4 md:py-3 rounded md:rounded-xl font-bold shadow-md md:shadow-lg flex items-center gap-1 md:gap-2 transition active:scale-95 text-xs md:text-base border border-red-500">
                      <Download size={14} className="sm:w-[18px] sm:h-[18px]" /> <span className="hidden sm:inline">Tải Bản In</span> PDF
                    </button>
                  </div>
               )}
             </div>
           </div>

           <div className="bg-blue-50 text-blue-800 text-[10px] md:text-sm px-2 py-1.5 md:px-4 md:py-3 rounded md:rounded-xl mb-2 md:mb-4 border border-blue-200 flex items-start sm:items-center gap-1 md:gap-2">
              <span className="text-base sm:text-lg shrink-0">💡</span> 
              <span className="leading-tight"><b>Mẹo:</b> <b>Click</b> vào chữ/ảnh thẻ để sửa, <b>kéo thả</b> để di chuyển!</span>
           </div>

           <div className="flex-1 w-full bg-slate-200 border border-slate-300 shadow-inner rounded-xl md:rounded-3xl overflow-hidden flex items-center justify-center p-0 md:p-8 relative">
              <div className="w-full h-full relative flex items-center justify-center">
                 <canvas 
                    ref={canvasRef} 
                    className={`max-w-full max-h-full object-contain shadow-xl md:shadow-2xl bg-white rounded-sm md:rounded-md touch-none select-none ${draggingItem ? 'cursor-grabbing' : 'cursor-grab'}`}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerLeave}
                    style={{ width: 'auto', height: 'auto', maxWidth: '100%', maxHeight: '100%' }}
                 />
              </div>
           </div>
       </div>
       
       {/* Edit Modal Overlay */}
       {editingField && (
         <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Chỉnh sửa nội dung</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Nội dung</label>
                  <textarea 
                    rows={3} 
                    className="w-full border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    value={data[editingField] as string}
                    onChange={e => handleDataChange(editingField, e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Font chữ</label>
                    <select 
                      className="w-full border border-slate-300 rounded-lg p-2"
                      value={data.styleOverrides?.[editingField]?.fontFamily || currentTemplate?.texts[editingField]?.fontFamily || 'sans-serif'}
                      onChange={e => handleStyleOverride(editingField, 'fontFamily', e.target.value)}
                    >
                      {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Cỡ chữ (px)</label>
                    <input 
                      type="number" 
                      className="w-full border border-slate-300 rounded-lg p-2"
                      value={data.styleOverrides?.[editingField]?.fontSize || currentTemplate?.texts[editingField]?.fontSize || 40}
                      onChange={e => handleStyleOverride(editingField, 'fontSize', Number(e.target.value))}
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Màu sắc & Kiểu chữ</label>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        className="h-10 w-16 border border-slate-300 rounded-lg p-1 cursor-pointer bg-white"
                        value={data.styleOverrides?.[editingField]?.color || currentTemplate?.texts[editingField]?.color || '#000000'}
                        onChange={e => handleStyleOverride(editingField, 'color', e.target.value)}
                      />
                      <span className="text-sm font-mono text-slate-500 uppercase">{data.styleOverrides?.[editingField]?.color || currentTemplate?.texts[editingField]?.color || '#000000'}</span>
                    </div>
                    
                    <div className="h-8 w-px bg-slate-200 mx-2"></div>
                    
                    <button 
                      onClick={() => {
                        const currentWeight = data.styleOverrides?.[editingField]?.weight || currentTemplate?.texts[editingField]?.weight || 'normal';
                        handleStyleOverride(editingField, 'weight', currentWeight === 'bold' ? 'normal' : 'bold');
                      }}
                      className={`w-10 h-10 rounded-lg font-serif font-bold text-lg flex items-center justify-center transition border ${
                        (data.styleOverrides?.[editingField]?.weight || currentTemplate?.texts[editingField]?.weight) === 'bold' 
                          ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="In đậm"
                    >
                      B
                    </button>
                    
                    <button 
                      onClick={() => {
                        const currentStyle = data.styleOverrides?.[editingField]?.fontStyle || currentTemplate?.texts[editingField]?.fontStyle || 'normal';
                        handleStyleOverride(editingField, 'fontStyle', currentStyle === 'italic' ? 'normal' : 'italic');
                      }}
                      className={`w-10 h-10 rounded-lg font-serif italic text-lg flex items-center justify-center transition border ${
                        (data.styleOverrides?.[editingField]?.fontStyle || currentTemplate?.texts[editingField]?.fontStyle) === 'italic' 
                          ? 'bg-blue-100 text-blue-700 border-blue-200 shadow-sm' 
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                      title="In nghiêng"
                    >
                      I
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button 
                  onClick={() => setEditingField(null)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-bold shadow-md transition active:scale-95"
                >
                  Xong
                </button>
              </div>
            </div>
         </div>
       )}
       {showBatchModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2"><span>📋</span> Nhập danh sách vinh danh hàng loạt</h3>
                  <button onClick={() => { setShowBatchModal(false); setBatchInput(''); }} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
               </div>
               
               <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                 <p className="font-bold mb-1">📌 Hướng dẫn nhanh:</p>
                 <ol className="list-decimal list-inside space-y-1 text-xs">
                   <li>Mở file Excel có danh sách học sinh (3 cột: <b>Tên, Lớp, Thành tích</b>)</li>
                   <li>Bôi đen vùng dữ liệu cần lấy rồi nhấn <b>Ctrl+C</b></li>
                   <li>Quay lại đây, click vào ô bên dưới và nhấn <b>Ctrl+V</b></li>
                   <li>Nhấn &quot;<b>Bắt đầu tạo</b>&quot; để bắt đầu vinh danh từng em!</li>
                 </ol>
               </div>
               
               <textarea 
                 className="w-full flex-1 min-h-[200px] border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 font-mono text-sm whitespace-pre overflow-auto"
                 placeholder={"Nguyễn Văn A\tLớp 8A\tHọc sinh Giỏi\nTrần Thị B\tLớp 8B\tHọc sinh Tiên Tiến\nLê Văn C\tLớp 9A\tHSG cấp Trường"}
                 value={batchInput}
                 onChange={e => setBatchInput(e.target.value)}
               />
               
               {batchInput.trim() && (
                 <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">
                   <p className="font-bold text-green-800">✅ Đã nhận diện: {batchInput.split('\n').filter((l: string) => l.trim()).length} học sinh</p>
                   <div className="mt-2 max-h-[120px] overflow-auto text-xs text-green-700 space-y-1">
                     {batchInput.split('\n').filter((l: string) => l.trim()).slice(0, 10).map((line: string, i: number) => {
                       const parts = line.includes('\t') ? line.split('\t') : line.split(',');
                       return <div key={i} className="flex gap-2"><span className="font-bold w-6">{i+1}.</span><span>{(parts[0] || '').trim()}</span><span className="text-green-500">|</span><span>{(parts[1] || '').trim()}</span><span className="text-green-500">|</span><span>{(parts[2] || '').trim()}</span></div>;
                     })}
                     {batchInput.split('\n').filter((l: string) => l.trim()).length > 10 && <div className="text-green-500 italic">... và {batchInput.split('\n').filter((l: string) => l.trim()).length - 10} em nữa</div>}
                   </div>
                 </div>
               )}
               
               <div className="mt-4 flex justify-end gap-3">
                  <button onClick={() => { setShowBatchModal(false); setBatchInput(''); }} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition">Hủy</button>
                  <button 
                    onClick={handleParseBatch} 
                    disabled={!batchInput.trim()}
                    className={`px-6 py-2.5 rounded-lg font-bold transition flex items-center gap-2 ${batchInput.trim() ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                  >
                    <Users size={16} /> Bắt đầu tạo
                  </button>
               </div>
             </div>
          </div>
       )}

    </div>
  );
};
