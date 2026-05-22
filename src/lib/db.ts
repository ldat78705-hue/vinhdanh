import { TemplateConfig, TextConfig } from '../types';

const DB_NAME = 'CertificateDB';
const DB_VERSION = 1;
const STORE_NAME = 'templates';

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const getTemplates = async (): Promise<TemplateConfig[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      let results = request.result;
      results = results.map((t: TemplateConfig) => {
         let modified = false;
         for (const key in t.texts) {
            const font = (t.texts as any)[key].fontFamily;
            if (font === '"Great Vibes", cursive' || font === "'Great Vibes'") {
               (t.texts as any)[key].fontFamily = '"Lora", serif';
               modified = true;
            }
         }
         if (modified) saveTemplate(t).catch(console.error);
         return t;
      });
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveTemplate = async (template: TemplateConfig): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(template);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteTemplate = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

const createDefaultText = (
  x: number, y: number, fontSize: number, color: string, align: 'left' | 'center' | 'right' = 'center', weight: 'normal' | 'bold' = 'normal'
): TextConfig => ({
  x, y, fontSize, color, align, weight, fontFamily: '"Lora", serif'
});

const generateBlueTemplate = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#1e3a8a';
  ctx.lineWidth = 40;
  ctx.strokeRect(20, 20, canvas.width - 40, canvas.height - 40);

  ctx.strokeStyle = '#dbeafe';
  ctx.lineWidth = 10;
  ctx.strokeRect(60, 60, canvas.width - 120, canvas.height - 120);

  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.moveTo(300, 20);
  ctx.lineTo(1300, 20);
  ctx.lineTo(1250, 200);
  ctx.lineTo(350, 200);
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.9);
};

const generateGoldTemplate = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#fffbeb';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 20;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);

  ctx.strokeStyle = '#fcd34d';
  ctx.lineWidth = 5;
  ctx.strokeRect(55, 55, canvas.width - 110, canvas.height - 110);

  ctx.fillStyle = '#b45309';
  ctx.fillRect(canvas.width/2 - 250, 40, 500, 150);

  return canvas.toDataURL('image/jpeg', 0.9);
};

const generatePremiumDarkTemplate = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d')!;

  // 1. Dark Gradient Background
  const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  bgGrad.addColorStop(0, '#100c08'); // very dark brown/gold
  bgGrad.addColorStop(0.5, '#241c0b');
  bgGrad.addColorStop(1, '#000000');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Light flare in the center-right
  const glow = ctx.createRadialGradient(1400, 540, 0, 1400, 540, 800);
  glow.addColorStop(0, 'rgba(212, 175, 55, 0.15)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. Avatar frame (left side)
  const avatarX = 550;
  const avatarY = 540;
  const radius = 280;

  // Outer glowing ring
  const ringGrad = ctx.createRadialGradient(avatarX, avatarY, radius - 20, avatarX, avatarY, radius + 40);
  ringGrad.addColorStop(0, '#fcd34d'); // Bright yellow gold
  ringGrad.addColorStop(0.5, '#b45309'); // Darker gold
  ringGrad.addColorStop(1, '#78350f'); 

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, radius + 15, 0, Math.PI * 2);
  ctx.strokeStyle = ringGrad;
  ctx.lineWidth = 15;
  ctx.stroke();

  // Draw some simulated wreath leaves using basic geometry around the circle
  ctx.fillStyle = '#fbbf24';
  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    // Don't draw at the very top to leave room for a cap
    if (angle > -Math.PI*0.4 && angle < Math.PI + Math.PI*0.4) {
      const lx = avatarX + Math.cos(angle) * (radius + 40);
      const ly = avatarY + Math.sin(angle) * (radius + 40);
      ctx.save();
      ctx.translate(lx, ly);
      // alternate angle
      ctx.rotate(angle + (i%2===0 ? Math.PI / 4 : -Math.PI / 4));
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw simple Graduation cap on top of the frame
  const capY = avatarY - radius - 15;
  ctx.fillStyle = '#fbbf24'; // amber color
  ctx.beginPath();
  ctx.moveTo(avatarX, capY - 45); // Top tip
  ctx.lineTo(avatarX + 90, capY);   // Right tip
  ctx.lineTo(avatarX, capY + 45); // Bottom tip
  ctx.lineTo(avatarX - 90, capY);   // Left tip
  ctx.closePath();
  ctx.fill();
  
  // Cap base
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.moveTo(avatarX - 45, capY + 20);
  ctx.lineTo(avatarX + 45, capY + 20);
  ctx.lineTo(avatarX + 45, capY + 65);
  ctx.lineTo(avatarX, capY + 75);
  ctx.lineTo(avatarX - 45, capY + 65);
  ctx.closePath();
  ctx.fill();

  // Subtle border around the certificate
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80);
  ctx.strokeRect(50, 50, canvas.width - 100, canvas.height - 100);

  // Sparkles
  const drawSparkle = (x: number, y: number, size: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.quadraticCurveTo(0, 0, size, 0);
    ctx.quadraticCurveTo(0, 0, 0, size);
    ctx.quadraticCurveTo(0, 0, -size, 0);
    ctx.quadraticCurveTo(0, 0, 0, -size);
    ctx.fill();
    ctx.restore();
  };
  drawSparkle(300, 200, 20);
  drawSparkle(900, 150, 30);
  drawSparkle(1200, 800, 15);
  drawSparkle(1700, 700, 25);
  drawSparkle(200, 900, 35);
  drawSparkle(1600, 250, 40);

  return canvas.toDataURL('image/jpeg', 0.9);
};

const generateGreenTemplate = (): string => {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1131;
  const ctx = canvas.getContext('2d')!;
  
  ctx.fillStyle = '#f0fdf4';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  ctx.strokeStyle = '#166534';
  ctx.lineWidth = 30;
  ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

  ctx.strokeStyle = '#86efac';
  ctx.lineWidth = 8;
  ctx.strokeRect(70, 70, canvas.width - 140, canvas.height - 140);

  ctx.fillStyle = '#166534';
  ctx.beginPath();
  ctx.arc(canvas.width / 2, 80, 400, 0, Math.PI);
  ctx.fill();

  return canvas.toDataURL('image/jpeg', 0.9);
};

export const seedDefaultTemplates = async () => {
  const seeded = localStorage.getItem('hasSeededDefaults_v2');
  if (seeded) return;
  
  const templates = await getTemplates();
  const hasDefault1 = templates.find(t => t.id === 'default-1');
  const hasDefault2 = templates.find(t => t.id === 'default-2');
  const hasDefault3 = templates.find(t => t.id === 'default-3');
  const hasDefault4 = templates.find(t => t.id === 'default-4');

  if (!hasDefault1) {
    const t1: TemplateConfig = {
      id: 'default-1',
      name: 'Mẫu 1',
      backgroundDataUrl: generateBlueTemplate(),
      width: 1600,
      height: 1131,
      avatar: { x: 300, y: 550, radius: 150, shape: 'circle' },
      logo: { x: 200, y: 150, width: 150, height: 150 },
      signature: { x: 1200, y: 850, width: 200, height: 100 },
      texts: {
        schoolName: { ...createDefaultText(800, 120, 40, '#ffffff', 'center', 'bold'), fontFamily: '"Lora", serif' },
        title: { ...createDefaultText(800, 350, 70, '#1e3a8a', 'center', 'bold'), fontFamily: '"Lora", serif' },
        studentName: { ...createDefaultText(800, 550, 80, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
        className: { ...createDefaultText(800, 650, 30, '#4b5563'), fontFamily: '"Lora", serif' },
        achievement: { ...createDefaultText(800, 750, 40, '#1e3a8a', 'center', 'bold'), fontFamily: '"Lora", serif' },
        date: { ...createDefaultText(1200, 950, 25, '#4b5563'), fontFamily: '"Lora", serif' },
        principalName: { ...createDefaultText(1200, 1000, 30, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
      }
    };
    await saveTemplate(t1);
  }

  if (!hasDefault2) {
    const t2: TemplateConfig = {
      id: 'default-2',
      name: 'Mẫu 2',
      backgroundDataUrl: generateGoldTemplate(),
      width: 1600,
      height: 1131,
      avatar: { x: 300, y: 550, radius: 150, shape: 'square' },
      logo: { x: 200, y: 150, width: 150, height: 150 },
      signature: { x: 1200, y: 850, width: 200, height: 100 },
      texts: {
        schoolName: { ...createDefaultText(800, 120, 40, '#b45309', 'center', 'bold'), fontFamily: '"Lora", serif' },
        title: { ...createDefaultText(800, 350, 70, '#b45309', 'center', 'bold'), fontFamily: '"Lora", serif' },
        studentName: { ...createDefaultText(800, 550, 80, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
        className: { ...createDefaultText(800, 650, 30, '#4b5563'), fontFamily: '"Lora", serif' },
        achievement: { ...createDefaultText(800, 750, 40, '#b45309', 'center', 'bold'), fontFamily: '"Lora", serif' },
        date: { ...createDefaultText(1200, 950, 25, '#4b5563'), fontFamily: '"Lora", serif' },
        principalName: { ...createDefaultText(1200, 1000, 30, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
      }
    };
    await saveTemplate(t2);
  }

  if (!hasDefault3) {
    const t3: TemplateConfig = {
      id: 'default-3',
      name: 'Mẫu 3',
      backgroundDataUrl: generatePremiumDarkTemplate(),
      width: 1920,
      height: 1080,
      avatar: { x: 550, y: 540, radius: 280, shape: 'circle' },
      logo: { x: 200, y: 150, width: 200, height: 200 },
      signature: { x: 1750, y: 850, width: 250, height: 120 },
      texts: {
        schoolName: { ...createDefaultText(1350, 220, 45, '#fef08a', 'center', 'bold'), fontFamily: '"Lora", serif' },
        title: { ...createDefaultText(1350, 350, 90, '#fde047', 'center', 'bold'), fontFamily: '"Lora", serif' },
        studentName: { ...createDefaultText(1350, 580, 70, '#ffffff', 'center', 'bold'), fontFamily: '"Lora", serif' },
        className: { ...createDefaultText(1350, 720, 40, '#fef08a', 'center', 'normal'), fontFamily: '"Lora", serif' },
        achievement: { ...createDefaultText(1350, 820, 45, '#fef08a', 'center', 'bold'), fontFamily: '"Lora", serif' },
        date: { ...createDefaultText(550, 950, 45, '#fef08a', 'center', 'bold'), fontFamily: '"Lora", serif' },
        principalName: { ...createDefaultText(1750, 1000, 25, '#b45309', 'center', 'bold'), fontFamily: '"Lora", serif' },
      }
    };
    await saveTemplate(t3);
  }

  if (!hasDefault4) {
    const t4: TemplateConfig = {
      id: 'default-4',
      name: 'Mẫu 4',
      backgroundDataUrl: generateGreenTemplate(),
      width: 1600,
      height: 1131,
      avatar: { x: 300, y: 550, radius: 150, shape: 'circle' },
      logo: { x: 200, y: 150, width: 150, height: 150 },
      signature: { x: 1200, y: 850, width: 200, height: 100 },
      texts: {
        schoolName: { ...createDefaultText(800, 140, 40, '#ffffff', 'center', 'bold'), fontFamily: '"Lora", serif' },
        title: { ...createDefaultText(800, 350, 70, '#166534', 'center', 'bold'), fontFamily: '"Lora", serif' },
        studentName: { ...createDefaultText(800, 550, 80, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
        className: { ...createDefaultText(800, 650, 30, '#4b5563'), fontFamily: '"Lora", serif' },
        achievement: { ...createDefaultText(800, 750, 40, '#166534', 'center', 'bold'), fontFamily: '"Lora", serif' },
        date: { ...createDefaultText(1200, 950, 25, '#4b5563'), fontFamily: '"Lora", serif' },
        principalName: { ...createDefaultText(1200, 1000, 30, '#111827', 'center', 'bold'), fontFamily: '"Lora", serif' },
      }
    };
    await saveTemplate(t4);
  }
  
  localStorage.setItem('hasSeededDefaults_v2', 'true');
};
