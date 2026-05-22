import React, { useState, useEffect, useRef } from 'react';
import { TemplateConfig, TextKeys, TextConfig, AvatarConfig } from '../types';
import { saveTemplate, deleteTemplate, getTemplates } from '../lib/db';
import { resizeImageFile } from '../lib/utils';
import { renderCertificateToCanvas } from '../lib/canvas';
import { FONT_OPTIONS } from '../lib/constants';
import { Trash2, Plus, Image as ImageIcon, Crosshair, Save, Download, Upload, Eye, EyeOff } from 'lucide-react';

const safeConfirm = (msg: string) => {
  try {
    return window.confirm(msg);
  } catch (e) {
    return true;
  }
};

const safeAlert = (msg: string) => {
  try {
    window.alert(msg);
  } catch (e) {
    console.log("Alert:", msg);
  }
};

const FIELD_LABELS: Record<string, string> = {
  schoolName: 'Tên trường',
  title: 'Chủ đề vinh danh',
  studentName: 'Tên học sinh',
  className: 'Lớp',
  achievement: 'Thành tích',
  date: 'Ngày cấp',
  principalName: 'Hiệu trưởng',
  avatar: 'Ảnh học sinh (Avatar)',
  logo: 'Biểu trưng (Logo)',
  signature: 'Chữ ký'
};

export const AdminPanel: React.FC = () => {
  const [templates, setTemplates] = useState<TemplateConfig[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<TemplateConfig | null>(null);
  const [selectedField, setSelectedField] = useState<TextKeys | 'avatar' | 'logo' | 'signature' | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadTemplates = async () => {
    const data = await getTemplates();
    setTemplates(data);
  };

  useEffect(() => {
    loadTemplates();
    document.fonts.ready.then(() => setFontsLoaded(true));
  }, []);

  useEffect(() => {
    if (editingTemplate && canvasRef.current) {
      // Mock data to show text on canvas
      const mockData: Record<string, string> = {
        schoolName: 'Trường Mẫu Example',
        title: 'CHỨNG NHẬN VINH DANH',
        studentName: 'NGUYỄN VĂN A',
        className: 'Lớp 12A1',
        achievement: 'Học sinh xuất sắc nhất tháng',
        date: 'Ngày 20 tháng 10 năm 2026',
        principalName: 'Hiệu trưởng\nTrần Văn B'
      };
      // Mock avatar
      const canvas = canvasRef.current;
      renderCertificateToCanvas(canvas, editingTemplate, mockData).then(() => {
        // Draw selection highlight over the canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.strokeStyle = 'red';
        ctx.setLineDash([5, 5]);
        ctx.lineWidth = 2;

        if (selectedField === 'avatar') {
          const config = editingTemplate.avatar || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, radius: 100, shape: 'circle' };
          const { x, y, radius, shape } = config;
          ctx.beginPath();
          if (shape === 'circle') {
            ctx.arc(x, y, radius, 0, Math.PI * 2);
          } else {
            ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
          }
          ctx.stroke();
        } else if (selectedField === 'logo') {
          const config = editingTemplate.logo || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
          const { x, y, width, height } = config;
          ctx.strokeRect(x - width/2, y - height/2, width, height);
        } else if (selectedField === 'signature') {
          const config = editingTemplate.signature || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 200, height: 100 };
          const { x, y, width, height } = config;
          ctx.strokeRect(x - width/2, y - height/2, width, height);
        } else if (selectedField && selectedField !== 'avatar' && selectedField !== 'logo' && selectedField !== 'signature') {
          const config = editingTemplate.texts[selectedField as TextKeys];
          ctx.beginPath();
          ctx.arc(config.x, config.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = 'red';
          ctx.fill();
        }
      });
    }
  }, [editingTemplate, selectedField, fontsLoaded]);

  const [isDragging, setIsDragging] = useState(false);

  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    const scaleX = canvasRef.current!.width / rect.width;
    const scaleY = canvasRef.current!.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editingTemplate || !selectedField) return;
    setIsDragging(true);
    const { x, y } = getCanvasCoords(e);
    updateFieldPosition(x, y);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDragging || !editingTemplate || !selectedField) return;
    const { x, y } = getCanvasCoords(e);
    updateFieldPosition(x, y);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const updateFieldPosition = (x: number, y: number) => {
    if (selectedField === 'avatar') {
      setEditingTemplate(prev => {
        if (!prev) return prev;
        const currentConfig = prev.avatar || { x: prev.width / 2, y: prev.height / 2, radius: 100, shape: 'circle' };
        return {
          ...prev,
          avatar: { ...currentConfig, x, y }
        };
      });
    } else if (selectedField === 'logo') {
      setEditingTemplate(prev => {
        if (!prev) return prev;
        const currentConfig = prev.logo || { x: prev.width / 2, y: prev.height / 2, width: 150, height: 150 };
        return {
          ...prev,
          logo: { ...currentConfig, x, y }
        };
      });
    } else if (selectedField === 'signature') {
      setEditingTemplate(prev => {
        if (!prev) return prev;
        const currentConfig = prev.signature || { x: prev.width / 2, y: prev.height / 2, width: 200, height: 100 };
        return {
          ...prev,
          signature: { ...currentConfig, x, y }
        };
      });
    } else {
      setEditingTemplate(prev => prev ? {
        ...prev,
        texts: {
          ...prev.texts,
          [selectedField as TextKeys]: { ...prev.texts[selectedField as TextKeys], x, y }
        }
      } : prev);
    }
  };

  const handleNewTemplateClick = () => {
    const id = 'custom-' + Date.now();
    const newDoc: TemplateConfig = {
      id,
      name: 'Mẫu mới ' + id,
      backgroundDataUrl: '',
      width: 1600,
      height: 1131,
      avatar: { x: 300, y: 500, radius: 100, shape: 'circle' },
      logo: { x: 200, y: 150, width: 150, height: 150 },
      signature: { x: 1200, y: 850, width: 200, height: 100 },
      texts: {
        schoolName: { x: 800, y: 150, fontSize: 40, color: '#000000', align: 'center', weight: 'bold', fontFamily: 'sans-serif' },
        title: { x: 800, y: 300, fontSize: 60, color: '#000000', align: 'center', weight: 'bold', fontFamily: 'sans-serif' },
        studentName: { x: 800, y: 500, fontSize: 70, color: '#000000', align: 'center', weight: 'bold', fontFamily: 'sans-serif' },
        className: { x: 800, y: 600, fontSize: 35, color: '#000000', align: 'center', weight: 'normal', fontFamily: 'sans-serif' },
        achievement: { x: 800, y: 700, fontSize: 45, color: '#000000', align: 'center', weight: 'bold', fontFamily: 'sans-serif' },
        date: { x: 1200, y: 900, fontSize: 30, color: '#000000', align: 'center', weight: 'normal', fontFamily: 'sans-serif' },
        principalName: { x: 1200, y: 980, fontSize: 35, color: '#000000', align: 'center', weight: 'bold', fontFamily: 'sans-serif' },
      }
    };
    setEditingTemplate(newDoc);
    setSelectedField(null);
  };

  const handleBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && editingTemplate) {
      const dataUrl = await resizeImageFile(file, 2000, 2000); // Max 2000px width/height for bg
      // Need to adjust width/height of template based on uploaded image
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        setEditingTemplate({
          ...editingTemplate,
          backgroundDataUrl: dataUrl,
          width: img.width,
          height: img.height
        });
      };
    }
  };

  const saveCurrent = async () => {
    if (editingTemplate) {
      await saveTemplate(editingTemplate);
      await loadTemplates();
      setEditingTemplate(null);
    }
  };

  const delTemplate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if(safeConfirm('Bạn có chắc muốn xóa mẫu này?')) {
      await deleteTemplate(id);
      loadTemplates();
      if (editingTemplate?.id === id) setEditingTemplate(null);
    }
  };

  const handleExportJson = () => {
    if (templates.length === 0) return safeAlert("Không có dữ liệu mẫu nào để tải xuống.");
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(templates));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = "mau_vinh_danh.json";
    a.click();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          for (const t of imported) {
            await saveTemplate(t); // Update or add imported templates
          }
          await loadTemplates();
          safeAlert("Nhập file dữ liệu thành công!");
        } else {
          safeAlert("File JSON không đúng định dạng!");
        }
      } catch(err) {
        safeAlert("Có lỗi xảy ra khi đọc file!");
      }
    };
    reader.readAsText(file);
    // Reset file input
    e.target.value = '';
  };

  return (
    <div className="flex flex-col md:flex-row h-full text-slate-800 overflow-hidden">
      <div className="w-full md:w-1/3 md:min-w-[320px] lg:max-w-sm border-r border-slate-200 bg-white shadow-sm overflow-y-auto flex flex-col h-[50vh] md:h-full shrink-0">
        {!editingTemplate ? (
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">Quản lý Mẫu Khung</h2>
            <button 
              onClick={handleNewTemplateClick}
              className="w-full bg-blue-600 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 hover:bg-blue-700 transition"
            >
              <Plus size={20} /> Thêm mẫu mới
            </button>

            <div className="flex gap-2 mt-3">
               <button onClick={handleExportJson} className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-medium">
                  <Download size={16} /> Xuất DS
               </button>
               <label className="flex-1 border border-slate-300 text-slate-600 rounded-lg py-2 flex items-center justify-center gap-2 hover:bg-slate-50 transition text-sm font-medium cursor-pointer">
                  <Upload size={16} /> Nhập DS
                  <input type="file" accept=".json" className="hidden" onChange={handleImportJson} />
               </label>
            </div>
            
            <button 
              onClick={async () => {
                if (safeConfirm('Bạn có chắc chắn muốn xóa TOÀN BỘ CÁC MẪU không? Thao tác này sẽ làm trống danh sách mẫu.')) {
                  const tx = (await new Promise<IDBDatabase>((resolve, reject) => {
                    const req = indexedDB.open('CertificateDB');
                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () => reject(req.error);
                  })).transaction('templates', 'readwrite');
                  tx.objectStore('templates').clear();
                  localStorage.removeItem('hasSeededDefaults');
                  setTemplates([]);
                  setEditingTemplate(null);
                }
              }}
              className="w-full mt-3 bg-red-50 text-red-600 border border-red-200 rounded-lg px-4 py-2 flex items-center justify-center gap-2 hover:bg-red-100 transition text-sm font-semibold"
            >
              <Trash2 size={16} /> Xóa TOÀN BỘ Mẫu
            </button>

            <div className="mt-6 space-y-4">
              {templates.map(t => (
                <div 
                  key={t.id} 
                  className="p-4 border rounded-xl hover:border-blue-500 cursor-pointer transition bg-slate-50 relative group"
                  onClick={() => { setEditingTemplate(t); setSelectedField(null); }}
                >
                  <p className="font-semibold">{t.name}</p>
                  <p className="text-xs text-slate-500 mt-1">ID: {t.id}</p>
                  <button 
                    onClick={(e) => delTemplate(t.id, e)}
                    className="absolute top-2 right-2 text-red-500 md:opacity-0 md:group-hover:opacity-100 p-2 hover:bg-red-50 rounded bg-white/80 md:bg-transparent shadow-sm md:shadow-none"
                    title="Xóa mẫu"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Chỉnh sửa mẫu</h2>
              <button onClick={() => setEditingTemplate(null)} className="text-sm text-slate-500 hover:text-slate-800">Hủy</button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tên mẫu</label>
                <input 
                  type="text" 
                  className="w-full border p-2 rounded-lg"
                  value={editingTemplate.name}
                  onChange={e => setEditingTemplate({...editingTemplate, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ảnh Nền</label>
                <label className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50 text-slate-500">
                  <ImageIcon size={24} className="mb-2" />
                  <span className="text-sm">Tải lên ảnh (.png, .jpg)</span>
                  <input type="file" className="hidden" accept="image/*" onChange={handleBgUpload} />
                </label>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Crosshair size={16} /> 
                  1. Chọn trường cần chỉnh X/Y
                </p>
                <p className="text-xs text-slate-500 mb-4">Sau đó click lên ảnh bên phải để định vị. Bấm biểu tượng con mắt để thêm/bớt trường thông tin khỏi mẫu.</p>
                
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {['schoolName', 'title', 'studentName', 'className', 'achievement', 'date', 'principalName', 'avatar', 'logo', 'signature'].map(field => {
                    const isHidden = editingTemplate.hiddenFields?.includes(field);
                    return (
                      <div key={field} className="relative flex">
                        <button
                          onClick={() => setSelectedField(field as any)}
                          className={`flex-1 text-xs p-2 rounded-l border border-r-0 text-left truncate transition ${selectedField === field ? 'bg-blue-100 border-blue-500 text-blue-800 font-semibold' : 'hover:bg-slate-50 text-slate-600'} ${isHidden ? 'opacity-50 line-through' : ''}`}
                        >
                          {FIELD_LABELS[field] || field}
                        </button>
                        <button
                          onClick={() => {
                            setEditingTemplate(prev => {
                              if (!prev) return prev;
                              const hidden = prev.hiddenFields || [];
                              if (hidden.includes(field)) {
                                return { ...prev, hiddenFields: hidden.filter(f => f !== field) };
                              } else {
                                return { ...prev, hiddenFields: [...hidden, field] };
                              }
                            });
                          }}
                          className={`px-2 border rounded-r flex items-center justify-center transition ${selectedField === field ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                          title={isHidden ? "Hiện trường này" : "Ẩn trường này vô hiệu hóa"}
                        >
                          {isHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end">
                   <button 
                     type="button" 
                     className="text-xs text-blue-600 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded hover:bg-blue-100 transition"
                     onClick={() => {
                       const centerX = editingTemplate.width / 2;
                       setEditingTemplate({
                         ...editingTemplate,
                         avatar: { ...editingTemplate.avatar, x: centerX },
                         texts: {
                           schoolName: { ...editingTemplate.texts.schoolName, x: centerX, align: 'center' },
                           title: { ...editingTemplate.texts.title, x: centerX, align: 'center' },
                           studentName: { ...editingTemplate.texts.studentName, x: centerX, align: 'center' },
                           className: { ...editingTemplate.texts.className, x: centerX, align: 'center' },
                           achievement: { ...editingTemplate.texts.achievement, x: centerX, align: 'center' },
                           date: { ...editingTemplate.texts.date, x: centerX, align: 'center' },
                           principalName: { ...editingTemplate.texts.principalName, x: centerX, align: 'center' }
                         }
                       });
                       safeAlert("Đã căn giữa tất cả các trường từ trên xuống dưới!");
                     }}
                   >
                     Căn giữa TẤT CẢ các trường
                   </button>
                </div>
              </div>

              {selectedField && selectedField !== 'avatar' && selectedField !== 'logo' && selectedField !== 'signature' && (
                <div className="pt-4 border-t bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
                  <p className="text-sm font-semibold mb-3 capitalize text-blue-700">Đang chọn: {FIELD_LABELS[selectedField]}</p>
                  <div className="space-y-4 text-sm">
                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1 flex justify-between">
                           <span>Tọa độ X</span>
                           <button 
                             type="button" 
                             className="text-blue-600 hover:text-blue-800 hover:underline text-[10px]"
                             onClick={() => {
                               setEditingTemplate({
                                 ...editingTemplate,
                                 texts: {
                                   ...editingTemplate.texts,
                                   [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], x: editingTemplate.width / 2 }
                                 }
                               });
                             }}
                             title="Căn giữa theo chiều ngang"
                           >Giữa trang</button>
                        </label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={Math.round(editingTemplate.texts[selectedField as TextKeys].x)}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], x: val }
                              }
                            });
                          }}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Tọa độ Y</label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={Math.round(editingTemplate.texts[selectedField as TextKeys].y)}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], y: val }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Cỡ chữ (px)</label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={editingTemplate.texts[selectedField as TextKeys].fontSize}
                          onChange={e => {
                            const val = Number(e.target.value);
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], fontSize: val }
                              }
                            });
                          }}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Màu sắc</label>
                        <input type="color" className="w-full border border-slate-300 rounded p-0 h-[32px] cursor-pointer"
                          value={editingTemplate.texts[selectedField as TextKeys].color}
                          onChange={e => {
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], color: e.target.value }
                              }
                            });
                          }}
                        />
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Font chữ</label>
                        <select className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={editingTemplate.texts[selectedField as TextKeys].fontFamily}
                          onChange={e => {
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], fontFamily: e.target.value }
                              }
                            });
                          }}
                        >
                          {FONT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      </div>
                      <div className="w-1/2">
                         <label className="block text-xs text-slate-500 font-medium mb-1">Độ đậm</label>
                          <select className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                            value={editingTemplate.texts[selectedField as TextKeys].weight}
                            onChange={e => {
                              setEditingTemplate({
                                ...editingTemplate,
                                texts: {
                                  ...editingTemplate.texts,
                                  [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], weight: e.target.value as any }
                                }
                              });
                            }}
                          >
                            <option value="normal">Bình thường</option>
                            <option value="bold">In đậm</option>
                          </select>
                      </div>
                    </div>

                    <div className="w-full">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Căn lề chữ</label>
                        <select className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={editingTemplate.texts[selectedField as TextKeys].align}
                          onChange={e => {
                            setEditingTemplate({
                              ...editingTemplate,
                              texts: {
                                ...editingTemplate.texts,
                                [selectedField]: { ...editingTemplate.texts[selectedField as TextKeys], align: e.target.value as any }
                              }
                            });
                          }}
                        >
                          <option value="left">Căn Trái</option>
                          <option value="center">Căn Giữa</option>
                          <option value="right">Căn Phải</option>
                        </select>
                      </div>
                  </div>
                </div>
              )}

              {selectedField === 'avatar' && (
                 <div className="pt-4 border-t bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
                 <p className="text-sm font-semibold mb-3 text-blue-700">Đang chọn: Ảnh thẻ (Avatar)</p>
                 <div className="space-y-4 text-sm">
                   <div className="flex gap-3">
                     <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1 flex justify-between">
                           <span>Tọa độ X</span>
                           <button 
                             type="button" 
                             className="text-blue-600 hover:text-blue-800 hover:underline text-[10px]"
                             onClick={() => {
                               setEditingTemplate({
                                 ...editingTemplate,
                                 avatar: { ...editingTemplate.avatar, x: editingTemplate.width / 2 }
                               });
                             }}
                             title="Căn giữa theo chiều ngang"
                           >Giữa trang</button>
                        </label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={Math.round(editingTemplate.avatar.x)}
                          onChange={e => {
                            setEditingTemplate({
                              ...editingTemplate,
                              avatar: { ...editingTemplate.avatar, x: Number(e.target.value) }
                            });
                          }}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Tọa độ Y</label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5 focus:ring-2 focus:ring-blue-100 outline-none"
                          value={Math.round(editingTemplate.avatar.y)}
                          onChange={e => {
                            setEditingTemplate({
                              ...editingTemplate,
                              avatar: { ...editingTemplate.avatar, y: Number(e.target.value) }
                            });
                          }}
                        />
                      </div>
                   </div>

                   <div className="flex gap-3">
                     <div className="w-1/2">
                       <label className="block text-xs text-slate-500 font-medium mb-1">Bán kính / Size</label>
                       <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                         value={editingTemplate.avatar.radius}
                         onChange={e => {
                           setEditingTemplate({
                             ...editingTemplate,
                             avatar: { ...editingTemplate.avatar, radius: Number(e.target.value) }
                           });
                         }}
                       />
                     </div>
                     <div className="w-1/2">
                       <label className="block text-xs text-slate-500 font-medium mb-1">Hình dáng</label>
                       <select className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                         value={editingTemplate.avatar.shape}
                         onChange={e => {
                           setEditingTemplate({
                             ...editingTemplate,
                             avatar: { ...editingTemplate.avatar, shape: e.target.value as any }
                           });
                         }}
                       >
                         <option value="circle">Hệ Tròn</option>
                         <option value="square">Vuông bo góc</option>
                       </select>
                     </div>
                   </div>
                 </div>
               </div>
              )}

              {(selectedField === 'logo' || selectedField === 'signature') && (
                 <div className="pt-4 border-t bg-slate-50 rounded-lg p-4 shadow-sm border border-slate-200">
                 <p className="text-sm font-semibold mb-3 text-blue-700">Đang chọn: {FIELD_LABELS[selectedField]}</p>
                 <div className="space-y-4 text-sm">
                   <div className="flex gap-3">
                     <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1 flex justify-between">
                           <span>Tọa độ X</span>
                           <button 
                             type="button" 
                             className="text-blue-600 hover:text-blue-800 hover:underline text-[10px]"
                             onClick={() => {
                               const currentConfig = editingTemplate[selectedField as 'logo' | 'signature'] || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
                               setEditingTemplate({
                                 ...editingTemplate,
                                 [selectedField]: { ...currentConfig, x: editingTemplate.width / 2 }
                               });
                             }}
                             title="Căn giữa theo chiều ngang"
                           >Giữa trang</button>
                        </label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                          value={Math.round(editingTemplate[selectedField as 'logo' | 'signature']?.x || editingTemplate.width / 2)}
                          onChange={e => {
                            const currentConfig = editingTemplate[selectedField as 'logo' | 'signature'] || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
                            setEditingTemplate({
                              ...editingTemplate,
                              [selectedField]: { ...currentConfig, x: Number(e.target.value) }
                            });
                          }}
                        />
                      </div>
                      <div className="w-1/2">
                        <label className="block text-xs text-slate-500 font-medium mb-1">Tọa độ Y</label>
                        <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                          value={Math.round(editingTemplate[selectedField as 'logo' | 'signature']?.y || editingTemplate.height / 2)}
                          onChange={e => {
                            const currentConfig = editingTemplate[selectedField as 'logo' | 'signature'] || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
                            setEditingTemplate({
                              ...editingTemplate,
                              [selectedField]: { ...currentConfig, y: Number(e.target.value) }
                            });
                          }}
                        />
                      </div>
                   </div>

                   <div className="flex gap-3">
                     <div className="w-1/2">
                       <label className="block text-xs text-slate-500 font-medium mb-1">Chiều ngang (Width)</label>
                       <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                         value={editingTemplate[selectedField as 'logo' | 'signature']?.width || 150}
                         onChange={e => {
                           const currentConfig = editingTemplate[selectedField as 'logo' | 'signature'] || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
                           setEditingTemplate({
                             ...editingTemplate,
                             [selectedField]: { ...currentConfig, width: Number(e.target.value) }
                           });
                         }}
                       />
                     </div>
                     <div className="w-1/2">
                       <label className="block text-xs text-slate-500 font-medium mb-1">Chiều dọc (Height)</label>
                       <input type="number" className="w-full border border-slate-300 bg-white rounded-md p-1.5"
                         value={editingTemplate[selectedField as 'logo' | 'signature']?.height || 150}
                         onChange={e => {
                           const currentConfig = editingTemplate[selectedField as 'logo' | 'signature'] || { x: editingTemplate.width / 2, y: editingTemplate.height / 2, width: 150, height: 150 };
                           setEditingTemplate({
                             ...editingTemplate,
                             [selectedField]: { ...currentConfig, height: Number(e.target.value) }
                           });
                         }}
                       />
                     </div>
                   </div>
                 </div>
               </div>
              )}
            </div>

            <button 
              onClick={saveCurrent}
              className="w-full bg-green-600 text-white rounded-lg px-4 py-3 flex items-center justify-center gap-2 hover:bg-green-700 transition font-semibold"
            >
              <Save size={20} /> Lưu thay đổi
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 bg-slate-100 p-4 md:p-8 flex flex-col relative overflow-hidden h-[50vh] md:h-full border-t md:border-t-0">
        {editingTemplate ? (
          <>
            <p className="text-center font-medium text-slate-500 mb-4">Kéo thả điểm chéo trên ảnh hoặc nhập số X/Y</p>
            <div className="flex-1 w-full bg-slate-200 border border-slate-300 rounded-xl overflow-auto flex items-center justify-center shadow-inner">
               {editingTemplate.backgroundDataUrl ? (
                  <canvas 
                    ref={canvasRef} 
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    className="max-w-full max-h-full object-contain cursor-crosshair shadow-2xl bg-white touch-none select-none"
                  />
               ) : (
                  <p className="text-slate-400">Vui lòng tải lên ảnh nền</p>
               )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400">
             Chọn hoặc thêm một mẫu để bắt đầu
          </div>
        )}
      </div>
    </div>
  );
};
