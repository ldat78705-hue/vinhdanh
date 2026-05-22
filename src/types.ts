export interface TextConfig {
  x: number;
  y: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  weight: 'normal' | 'bold' | 'lighter' | string;
  fontStyle?: 'normal' | 'italic';
  fontFamily: string;
  effect?: 'none' | 'gold' | 'glow' | 'emboss' | 'longShadow' | 'stroke' | 'curved' | 'gradient' | 'glitter';
  effectColor?: string;
}

export interface AvatarConfig {
  x: number;
  y: number;
  radius: number; // For circle it's radius, for square it's half-width
  shape: 'circle' | 'square';
}

export interface ImageConfig {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type TextKeys = 
  | 'schoolName' 
  | 'title' 
  | 'studentName' 
  | 'className' 
  | 'achievement' 
  | 'date' 
  | 'principalName';

export interface BatchStudent {
  studentName: string;
  className: string;
  achievement: string;
}

export interface TemplateConfig {
  id: string;
  name: string;
  backgroundDataUrl: string; // Base64
  width: number;
  height: number;
  avatar: AvatarConfig;
  logo?: ImageConfig;
  signature?: ImageConfig;
  hiddenFields?: string[]; // Array of keys (TextKeys or 'avatar' or 'logo' or 'signature') that are hidden
  texts: Record<TextKeys, TextConfig>;
}

export interface FieldStyleOverride {
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  x?: number;
  y?: number;
  weight?: 'normal' | 'bold' | 'lighter' | string;
  fontStyle?: 'normal' | 'italic';
  effect?: 'none' | 'gold' | 'glow' | 'emboss' | 'longShadow' | 'stroke' | 'curved' | 'gradient' | 'glitter';
  effectColor?: string;
}

export interface CertificateData {
  schoolName: string;
  title: string;
  studentName: string;
  className: string;
  achievement: string;
  date: string;
  principalName: string;
  avatarDataUrl?: string; // Base64 uploaded student photo
  avatarScale: number;
  avatarOffsetX: number;
  avatarOffsetY: number;
  avatarOverride?: Partial<AvatarConfig>;
  removeAvatarBg?: boolean;
  avatarBgColor?: string;
  avatarBgTolerance?: number;
  logoDataUrl?: string; // Base64 uploaded logo
  showLogo?: boolean;
  removeLogoBg?: boolean;
  logoOverride?: Partial<ImageConfig>;
  signatureDataUrl?: string; // Base64 uploaded signature
  showSignature?: boolean;
  removeSignatureBg?: boolean;
  signatureOverride?: Partial<ImageConfig>;
  visibleFields: Record<TextKeys, boolean>;
  styleOverrides?: Partial<Record<TextKeys, FieldStyleOverride>>;
}
