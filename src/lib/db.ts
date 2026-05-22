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

export const seedDefaultTemplates = async () => {
  const seeded = localStorage.getItem('hasSeededDefaults_v5');
  if (seeded) return;
  
  try {
    const res = await fetch('/defaultTemplates.json');
    const templates = await res.json();
    for (const t of templates) {
      await saveTemplate(t);
    }
    localStorage.setItem('hasSeededDefaults_v5', 'true');
  } catch (err) {
    console.error('Failed to load default templates', err);
  }
};

