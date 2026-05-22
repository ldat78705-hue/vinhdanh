import { TextConfig, AvatarConfig, ImageConfig } from '../types';

const imageCache = new Map<string, HTMLImageElement>();

const loadImage = async (src: string): Promise<HTMLImageElement> => {
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(img); // return broken image to prevent hang
    };
  });
};

export const renderCertificateToCanvas = async (
  canvas: HTMLCanvasElement,
  template: { width: number; height: number; backgroundDataUrl: string; texts: Record<string, TextConfig>; avatar?: AvatarConfig; logo?: ImageConfig; signature?: ImageConfig; hiddenFields?: string[] },
  data: Record<string, string>,
  avatarDataUrl?: string
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Set physical resolution
  canvas.width = template.width;
  canvas.height = template.height;

  // 1. Draw Background
  const bgImg = await loadImage(template.backgroundDataUrl);
  if (bgImg.width) {
    ctx.drawImage(bgImg, 0, 0, template.width, template.height);
  }

  // Helper to remove background color from an image (chroma key)
  const removeColorBackground = (img: HTMLImageElement, hexColor: string = '#ffffff', tolerance: number = 30): HTMLCanvasElement => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return tempCanvas;
    
    tempCtx.drawImage(img, 0, 0);
    const imgData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    const pixels = imgData.data;
    
    // Parse hex
    const rTarget = parseInt(hexColor.slice(1, 3), 16) || 255;
    const gTarget = parseInt(hexColor.slice(3, 5), 16) || 255;
    const bTarget = parseInt(hexColor.slice(5, 7), 16) || 255;

    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i+1];
      const b = pixels[i+2];
      
      const distance = Math.sqrt((r - rTarget)**2 + (g - gTarget)**2 + (b - bTarget)**2);
      if (distance < tolerance) {
        pixels[i+3] = 0; // Set alpha to 0
      }
    }
    
    tempCtx.putImageData(imgData, 0, 0);
    return tempCanvas;
  };

  // Helper to draw extra images (logo, signature)
  const drawExtraImage = async (dataUrl: string | undefined, config: ImageConfig | undefined, removeBg: boolean = false) => {
    if (!dataUrl || !config) return;
    const img = await loadImage(dataUrl);
    if (!img.width) return;
    
    // Calculate true height based on image aspect ratio
    const aspect = img.height / img.width;
    const renderHeight = config.width * aspect;
    
    let sourceImage: CanvasImageSource = img;
    if (removeBg) {
       sourceImage = removeColorBackground(img, '#ffffff', 30);
    }
    
    // Center the image around x, y
    ctx.drawImage(
      sourceImage,
      config.x - config.width / 2,
      config.y - renderHeight / 2,
      config.width,
      renderHeight
    );
  };

  // 1.5 Draw Logo
  if (!template.hiddenFields?.includes('logo') && (data as any).showLogo !== false && (data as any).logoDataUrl) {
    const defaultLogo = template.logo || { x: template.width / 2 - 200, y: 150, width: 150, height: 150 };
    const override = (data as any).logoOverride || {};
    const logoConfig = { ...defaultLogo, ...override };
    await drawExtraImage((data as any).logoDataUrl, logoConfig, (data as any).removeLogoBg);
  }

  // 2. Draw Avatar if provided
  if (!template.hiddenFields?.includes('avatar') && avatarDataUrl && template.avatar) {
    const avatar = await loadImage(avatarDataUrl);
    if (avatar.width) {
      ctx.save();
      const defaultAvatar = template.avatar;
      const override = (data as any).avatarOverride || {};
      const x = override.x ?? defaultAvatar.x;
      const y = override.y ?? defaultAvatar.y;
      const radius = override.radius ?? defaultAvatar.radius;
      const shape = override.shape ?? defaultAvatar.shape;
      
      ctx.beginPath();
      if (shape === 'circle') {
        ctx.arc(x, y, radius, 0, Math.PI * 2);
      } else {
        // rounded square trick or simple square
        ctx.rect(x - radius, y - radius, radius * 2, radius * 2);
      }
      ctx.clip();
      
      // Draw image covering the cropped area (cover behavior)
      const aspect = avatar.width / avatar.height;
      const scale = (data.avatarScale !== undefined ? parseFloat(data.avatarScale as unknown as string) : 1);
      const offsetX = (data.avatarOffsetX !== undefined ? parseFloat(data.avatarOffsetX as unknown as string) : 0);
      const offsetY = (data.avatarOffsetY !== undefined ? parseFloat(data.avatarOffsetY as unknown as string) : 0);

      let drawW = radius * 2;
      let drawH = radius * 2;
      if (aspect > 1) {
        drawW = drawH * aspect;
      } else {
        drawH = drawW / aspect;
      }

      drawW *= scale;
      drawH *= scale;

      let sourceAvatar: CanvasImageSource = avatar;
      if ((data as any).removeAvatarBg) {
         sourceAvatar = removeColorBackground(
            avatar, 
            (data as any).avatarBgColor || '#ffffff', 
            (data as any).avatarBgTolerance || 50
         );
      }

      ctx.drawImage(
        sourceAvatar, 
        x - drawW / 2 + offsetX, 
        y - drawH / 2 + offsetY, 
        drawW, 
        drawH
      );
      ctx.restore();
    }
  }

  // 3. Draw Texts
  Object.entries(template.texts).forEach(([key, config]) => {
    // Check if it's hidden by template
    if (template.hiddenFields?.includes(key)) return;

    // Check visibility toggle (default to true if undefined)
    const visibleFields = (data as any).visibleFields || {};
    if (visibleFields[key] === false) return;

    const value = data[key];
    if (!value) return;

    const overrides = (data as any).styleOverrides?.[key] || {};
    const fontSize = overrides.fontSize || config.fontSize;
    const color = overrides.color || config.color;
    const fontFamily = overrides.fontFamily || config.fontFamily;
    const weight = overrides.weight || config.weight || 'normal';
    const fontStyle = overrides.fontStyle || config.fontStyle || 'normal';
    const drawX = overrides.x ?? config.x;
    const drawY = overrides.y ?? config.y;

    ctx.font = `${fontStyle} ${weight} ${fontSize}px ${fontFamily}`;
    ctx.textAlign = config.align;
    ctx.textBaseline = 'middle';
    
    const effect = overrides.effect || config.effect || 'none';
    const effectColor = overrides.effectColor || config.effectColor || '#ffffff';

    // Simple line break support if using \n
    const lines = value.split('\n');
    lines.forEach((line, index) => {
      const yPos = drawY + (index * fontSize * 1.2);
      ctx.save();
      
      if (effect === 'gold') {
         const metrics = ctx.measureText(line);
         const w = metrics.width;
         const startX = config.align === 'center' ? drawX - w/2 : config.align === 'right' ? drawX - w : drawX;
         const grad = ctx.createLinearGradient(startX, yPos - fontSize/2, startX, yPos + fontSize/2);
         grad.addColorStop(0, '#BF953F');
         grad.addColorStop(0.25, '#FCF6BA');
         grad.addColorStop(0.5, '#b38728');
         grad.addColorStop(0.75, '#fbf5b7');
         grad.addColorStop(1, '#AA771C');
         ctx.fillStyle = grad;
         ctx.shadowColor = 'rgba(0,0,0,0.3)';
         ctx.shadowBlur = 4;
         ctx.shadowOffsetY = 2;
         ctx.fillText(line, drawX, yPos);
         ctx.strokeStyle = effectColor;
         ctx.lineWidth = Math.max(1, fontSize * 0.02);
         ctx.strokeText(line, drawX, yPos);
      } else if (effect === 'glow') {
         ctx.shadowColor = effectColor;
         ctx.shadowBlur = Math.max(10, fontSize * 0.3);
         ctx.fillStyle = color;
         ctx.fillText(line, drawX, yPos);
         ctx.fillText(line, drawX, yPos); // double for strength
      } else if (effect === 'emboss') {
         ctx.fillStyle = 'rgba(255,255,255,0.7)';
         ctx.fillText(line, drawX - 2, yPos - 2);
         ctx.fillStyle = 'rgba(0,0,0,0.5)';
         ctx.fillText(line, drawX + 2, yPos + 2);
         ctx.fillStyle = color;
         ctx.fillText(line, drawX, yPos);
      } else if (effect === 'longShadow') {
         ctx.fillStyle = effectColor;
         for(let i=0; i<Math.min(30, fontSize); i++) {
            ctx.fillText(line, drawX + i, yPos + i);
         }
         ctx.fillStyle = color;
         ctx.fillText(line, drawX, yPos);
      } else if (effect === 'stroke') {
         ctx.strokeStyle = color;
         ctx.lineWidth = Math.max(2, fontSize * 0.05);
         ctx.strokeText(line, drawX, yPos);
         ctx.fillStyle = effectColor; 
         ctx.fillText(line, drawX, yPos);
      } else if (effect === 'gradient') {
         const metrics = ctx.measureText(line);
         const w = metrics.width;
         const startX = config.align === 'center' ? drawX - w/2 : config.align === 'right' ? drawX - w : drawX;
         const grad = ctx.createLinearGradient(startX, yPos, startX + w, yPos);
         grad.addColorStop(0, color);
         grad.addColorStop(1, effectColor);
         ctx.fillStyle = grad;
         ctx.fillText(line, drawX, yPos);
      } else if (effect === 'curved') {
         ctx.fillStyle = color;
         const metrics = ctx.measureText(line);
         const radius = Math.max(metrics.width * 0.8, fontSize * 2);
         const angleSpan = metrics.width / radius;
         
         ctx.save();
         ctx.translate(drawX, yPos + radius);
         ctx.rotate(-angleSpan / 2);
         
         let currentAngle = 0;
         for(let i = 0; i < line.length; i++) {
            const char = line[i];
            const charWidth = ctx.measureText(char).width;
            ctx.save();
            ctx.rotate(currentAngle + (charWidth / radius) / 2);
            ctx.fillText(char, 0, -radius);
            ctx.restore();
            currentAngle += charWidth / radius;
         }
         ctx.restore();
      } else if (effect === 'glitter') {
         ctx.fillStyle = color;
         ctx.fillText(line, drawX, yPos);
         
         ctx.fillStyle = effectColor;
         const metrics = ctx.measureText(line);
         const w = metrics.width;
         const startX = config.align === 'center' ? drawX - w/2 : config.align === 'right' ? drawX - w : drawX;
         for(let i=0; i<7; i++){
             const px = startX + Math.random() * w;
             const py = yPos - fontSize/2 + Math.random() * fontSize;
             ctx.beginPath();
             ctx.arc(px, py, Math.max(1, fontSize * 0.04), 0, Math.PI*2);
             ctx.fill();
         }
      } else {
         ctx.fillStyle = color;
         ctx.fillText(line, drawX, yPos);
      }
      
      ctx.restore();
    });
  });

  // 4. Draw Signature after text
  if (!template.hiddenFields?.includes('signature') && (data as any).showSignature !== false && (data as any).signatureDataUrl) {
    const defaultSig = template.signature || { x: template.width / 2 + 200, y: template.height - 150, width: 200, height: 100 };
    const override = (data as any).signatureOverride || {};
    const sigConfig = { ...defaultSig, ...override };
    await drawExtraImage((data as any).signatureDataUrl, sigConfig, (data as any).removeSignatureBg);
  }
};
