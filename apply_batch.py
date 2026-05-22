import re

with open('src/components/CertificateBuilder.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Insert functions
functions = """
  const handleParseBatch = () => {
    const lines = batchInput.split('\\n').map(l => l.trim()).filter(Boolean);
    const parsed = lines.map(line => {
        const parts = line.split('\\t');
        return {
            studentName: parts[0] || '',
            className: parts[1] || '',
            achievement: parts[2] || ''
        };
    });
    if (parsed.length === 0) return;
    setBatchList(parsed);
    setCurrentBatchIndex(0);
    setShowBatchModal(false);
    
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

  const handleNextBatch = () => {
    handleDownload();
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
        alert('Đã hoàn thành toàn bộ danh sách!');
        setCurrentBatchIndex(-1);
        setBatchList([]);
    }
  };
"""

content = re.sub(r'(const handleAIBgRemoval = async \(\) => \{.*?\n  \};\n)', r'\1' + functions, content, flags=re.DOTALL)


# 2. Modify "Tạo Chứng Nhận" to include the "Nhập từ Excel" button
header_html = """             <div className="flex items-center justify-between mb-2">
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
             )}"""

content = re.sub(r'<h2 className="text-xl font-bold text-slate-800">Tạo Chứng Nhận</h2>', header_html, content)


# 3. Replace Download button
download_button = """             {currentBatchIndex >= 0 ? (
                <button onClick={handleNextBatch} className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition active:scale-95">
                  <Download size={18} />
                  <span>Lưu & Tới em tiếp theo</span>
                </button>
             ) : (
                <button onClick={handleDownload} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 md:px-6 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg transition active:scale-95">
                  <Download size={18} />
                  <span>Tải Ảnh</span>
                </button>
             )}"""
content = re.sub(r'<button onClick=\{handleDownload\} className="bg-gradient-to-r from-blue-600.*?<span>Tải Ảnh</span>\s*</button>', download_button, content, flags=re.DOTALL)


# 4. Add Batch Modal before final closing </div>
batch_modal = """
       {showBatchModal && (
         <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold">Nhập danh sách vinh danh</h3>
                 <button onClick={() => setShowBatchModal(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                 Copy và Paste (Dán) danh sách từ Excel vào ô dưới đây. Dữ liệu cần có 3 cột theo thứ tự: <b>Tên | Lớp | Thành tích</b>.
              </p>
              <textarea 
                className="w-full flex-1 min-h-[300px] border border-slate-300 rounded-lg p-3 outline-none focus:border-blue-500 font-mono text-sm whitespace-pre overflow-auto"
                placeholder="Nguyễn Văn A&#9;Lớp 8A&#9;Học sinh Giỏi&#10;Trần Thị B&#9;Lớp 8B&#9;Học sinh Tiên Tiến"
                value={batchInput}
                onChange={e => setBatchInput(e.target.value)}
              />
              <div className="mt-4 flex justify-end gap-3">
                 <button onClick={() => setShowBatchModal(false)} className="px-4 py-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200">Hủy</button>
                 <button onClick={handleParseBatch} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">Bắt đầu tạo</button>
              </div>
            </div>
         </div>
       )}
    </div>
  );
};
"""
content = re.sub(r'</div>\s*</div>\s*\);\s*};\s*$', batch_modal, content)

with open('src/components/CertificateBuilder.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
