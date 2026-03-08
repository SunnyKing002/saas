'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, Sparkles, Image as ImageIcon, Download, Loader2, PawPrint, Bug, Hexagon, Skull, PartyPopper, Wand2, X } from 'lucide-react';

const STYLES = [
  { name: 'Tiger', icon: <PawPrint size={24} />, prompt: 'face paint of a tiger, realistic, highly detailed, vibrant orange and black stripes' },
  { name: 'Butterfly', icon: <Bug size={24} />, prompt: 'face paint of a butterfly, wings on eyes, colorful, magical, pastel tones' },
  { name: 'Spiderman', icon: <Hexagon size={24} />, prompt: 'face paint of Spiderman mask, red and black web pattern, superhero style' },
  { name: 'Skeleton', icon: <Skull size={24} />, prompt: 'face paint of a skeleton skull, black and white, spooky halloween style' },
  { name: 'Clown', icon: <PartyPopper size={24} />, prompt: 'face paint of a cute clown, red nose, colorful diamond cheeks, happy circus style' },
  { name: 'Fairy', icon: <Wand2 size={24} />, prompt: 'face paint of a fairy, glitter details, pastel colors, magical forest style' },
];

const TEMPLATE_IMAGES = [
  { src: '/showcase/template_model_1.jpg', alt: 'cute face paint designs for kids birthday parties' },
  { src: '/showcase/template_model_2.jpg', alt: 'simple beginner face painting ideas' },
  { src: '/showcase/template_model_3.jpg', alt: 'quick and easy face paint designs for parties' },
  { src: '/showcase/template_model_4.jpg', alt: 'AI-generated easy face paint ideas for kids' },
];

const MAX_FREE_GENERATIONS = 5;

function compressImage(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_DIM = 1200;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) { height *= MAX_DIM / width; width = MAX_DIM; }
          else { width *= MAX_DIM / height; height = MAX_DIM; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas not supported'));
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

type Toast = { id: number; message: string; type: 'success' | 'error' | 'loading' };

export default function FacePaintGenerator() {
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [freeCount, setFreeCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const lastDate = localStorage.getItem('fp_last_date');
    const today = new Date().toDateString();
    if (lastDate !== today) {
      localStorage.setItem('fp_last_date', today);
      localStorage.setItem('fp_count', '0');
      setFreeCount(0);
    } else {
      setFreeCount(parseInt(localStorage.getItem('fp_count') || '0', 10));
    }
  }, []);

  const addToast = (message: string, type: Toast['type']): number => {
    const id = ++toastIdRef.current;
    setToasts(prev => [...prev, { id, message, type }]);
    if (type !== 'loading') {
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
    }
    return id;
  };

  const removeToast = (id: number) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      addToast('Image too large. Please upload under 20MB.', 'error');
      return;
    }
    const loadId = addToast('Processing image...', 'loading');
    try {
      const compressed = await compressImage(file);
      setSelectedImage(compressed);
      removeToast(loadId);
    } catch {
      removeToast(loadId);
      addToast('Failed to process image. Try another.', 'error');
    }
  };

  const handleTemplateSelect = async (src: string) => {
    try {
      const resp = await fetch(src);
      const blob = await resp.blob();
      const compressed = await compressImage(blob);
      setSelectedImage(compressed);
    } catch {
      addToast('Failed to load template image.', 'error');
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      addToast('Please describe or select a face paint style.', 'error');
      return;
    }

    if (freeCount >= MAX_FREE_GENERATIONS) {
      addToast(`Daily limit reached (${MAX_FREE_GENERATIONS}/${MAX_FREE_GENERATIONS}). Come back tomorrow or upgrade!`, 'error');
      return;
    }

    setIsLoading(true);
    setGeneratedImage(null);
    const loadId = addToast('AI is painting... this may take 20-30 seconds', 'loading');

    try {
      const body: { prompt: string; imageBase64?: string } = { prompt };
      if (selectedImage) body.imageBase64 = selectedImage;

      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await resp.json() as { success: boolean; imageUrl?: string; error?: string };
      removeToast(loadId);

      if (data.success && data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        const newCount = freeCount + 1;
        setFreeCount(newCount);
        localStorage.setItem('fp_count', newCount.toString());
        addToast(`Generated! (${newCount}/${MAX_FREE_GENERATIONS} free today)`, 'success');
      } else {
        addToast(data.error || 'Generation failed. Please try again.', 'error');
      }
    } catch (err) {
      removeToast(loadId);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('413')) {
        addToast('Image too large. Please try a smaller photo.', 'error');
      } else {
        addToast('Failed to connect. Please try again.', 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!generatedImage) return;
    try {
      const resp = await fetch(generatedImage);
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `face-paint-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      a.remove();
    } catch {
      window.open(generatedImage, '_blank');
    }
  };

  return (
    <div className="generator-root">
      {/* Toast notifications */}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'loading' && <Loader2 size={16} className="toast-spinner-icon" />}
            {t.type === 'success' && <Sparkles size={16} />}
            <span>{t.message}</span>
            {t.type !== 'loading' && (
              <button onClick={() => removeToast(t.id)} className="toast-close" aria-label="Close Toast">
                <X size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="generator-grid">
        {/* Input Section */}
        <div className="generator-input">
          {/* Upload */}
          <div className="field-group">
            <label className="field-label">
              <span className="field-label-num">1</span>
              Upload Photo <span className="field-label-opt">(Optional)</span>
            </label>
            <div
              className={`upload-zone ${selectedImage ? 'has-image' : ''}`}
              onClick={() => !selectedImage && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === 'Enter' && !selectedImage && fileInputRef.current?.click()}
              aria-label="Upload face photo"
            >
              {selectedImage ? (
                <>
                  <img src={selectedImage} alt="Uploaded face" className="upload-preview" />
                  <button
                    className="upload-remove"
                    onClick={e => { e.stopPropagation(); setSelectedImage(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    aria-label="Remove image"
                  >
                    <X size={16} />
                  </button>
                </>
              ) : (
                <div className="upload-placeholder">
                  <div className="upload-icon"><Camera size={40} className="text-gray-400 mx-auto" strokeWidth={1.5} /></div>
                  <p className="upload-hint-primary">Click to upload a face photo</p>
                  <p className="upload-hint-secondary">No photo? We'll generate on a model!</p>
                </div>
              )}
              <input type="file" ref={fileInputRef} className="hidden-input" accept="image/*" onChange={handleImageUpload} />
            </div>

            {/* Template grid */}
            {!selectedImage && (
              <div className="template-grid-wrap">
                <p className="template-label">Or try with a model:</p>
                <div className="template-grid">
                  {TEMPLATE_IMAGES.map((img, i) => (
                    <button
                      key={i}
                      className="template-thumb"
                      onClick={() => handleTemplateSelect(img.src)}
                      aria-label={`Use template: ${img.alt}`}
                    >
                      <img src={img.src} alt={img.alt} loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Style Picker */}
          <div className="field-group">
            <label className="field-label">
              <span className="field-label-num">2</span>
              Choose Style or Describe
            </label>
            <div className="style-grid">
              {STYLES.map(style => (
                <button
                  key={style.name}
                  className={`style-btn ${selectedStyle === style.name ? 'selected' : ''}`}
                  onClick={() => { setSelectedStyle(style.name); setPrompt(style.prompt); }}
                  aria-pressed={selectedStyle === style.name}
                >
                  <span className="style-icon">{style.icon}</span>
                  <span className="style-name">{style.name}</span>
                </button>
              ))}
            </div>
            <textarea
              className="prompt-input"
              placeholder="Describe the face paint you want... e.g. 'A colorful rainbow with clouds and stars'"
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              rows={3}
              aria-label="Describe face paint design"
            />
          </div>

          {/* Counter */}
          <div className="usage-bar">
            <div className="usage-track">
              <div
                className="usage-fill"
                style={{ width: `${(freeCount / MAX_FREE_GENERATIONS) * 100}%` }}
              />
            </div>
            <span className="usage-label">{freeCount}/{MAX_FREE_GENERATIONS} free today</span>
          </div>

          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            aria-label="Generate face paint design"
          >
            {isLoading ? (
              <>
                <Loader2 className="btn-spinner-icon" size={20} />
                AI is painting...
              </>
            ) : (
              <>
                <Sparkles size={20} /> {selectedImage ? 'Try On Face' : 'Generate Design'}
              </>
            )}
          </button>
        </div>

        {/* Result Section */}
        <div className="generator-result">
          <label className="field-label">Result</label>
          <div className="result-canvas">
            {isLoading ? (
              <div className="result-loading">
                <div className="loading-anim">
                  <Sparkles size={48} className="mx-auto text-pink-500" strokeWidth={1.5} />
                </div>
                <p className="loading-text">AI is painting your design...</p>
                <p className="loading-subtext">This usually takes 20-30 seconds</p>
              </div>
            ) : generatedImage ? (
              <div className="result-image-wrap">
                <img src={generatedImage} alt="AI generated face paint design" className="result-image" />
                <button
                  className="download-btn"
                  onClick={handleDownload}
                  aria-label="Download generated image"
                >
                  <Download size={16} /> Download
                </button>
              </div>
            ) : (
              <div className="result-empty">
                <div className="result-empty-icon"><ImageIcon size={48} className="mx-auto text-gray-300" strokeWidth={1} /></div>
                <p>Your AI face paint design will appear here</p>
                <p className="result-empty-sub">Choose a style above and click Generate</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .generator-root {
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          padding: 1rem;
          position: relative;
        }

        /* Toast */
        .toast-container {
          position: fixed;
          top: 80px;
          right: 1.5rem;
          z-index: 9999;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 380px;
        }

        .toast {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.875rem 1.125rem;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 500;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          animation: slideIn 0.3s ease;
          backdrop-filter: blur(8px);
        }

        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }

        .toast-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .toast-error { background: #fff1f2; color: #9f1239; border: 1px solid #fecdd3; }
        .toast-loading { background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }

        .toast-spinner-icon {
          animation: spin 1s linear infinite;
        }

        .toast-close {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          color: inherit;
          opacity: 0.6;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        /* Grid */
        .generator-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
        }

        /* Field */
        .field-group { display: flex; flex-direction: column; gap: 0.625rem; }
        .field-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
        }
        .field-label-num {
          width: 24px; height: 24px;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.75rem; font-weight: 700; flex-shrink: 0;
        }
        .field-label-opt { font-size: 0.75rem; font-weight: 400; color: #9ca3af; }

        /* Upload */
        .upload-zone {
          border: 2px dashed #e5e7eb;
          border-radius: 16px;
          height: 220px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          background: #fafafa;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }

        .upload-zone:hover:not(.has-image) {
          border-color: #ec4899;
          background: #fdf2f8;
        }

        .upload-zone.has-image {
          cursor: default;
          border-style: solid;
          border-color: #e5e7eb;
        }

        .upload-placeholder { text-align: center; padding: 1rem; }
        .upload-icon { margin-bottom: 0.75rem; color: #9ca3af; }
        .upload-hint-primary { font-size: 0.9375rem; font-weight: 700; color: #111827; margin-bottom: 0.25rem; font-family: 'Outfit', sans-serif;}
        .upload-hint-secondary { font-size: 0.8125rem; color: #6b7280; }

        .upload-preview {
          width: 100%; height: 100%; object-fit: contain;
        }

        .upload-remove {
          position: absolute; top: 8px; right: 8px;
          width: 32px; height: 32px;
          background: rgba(255,255,255,0.9);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(0,0,0,0.05);
          border-radius: 50%;
          cursor: pointer;
          color: #374151;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.2s ease;
        }

        .upload-remove:hover { 
          background: white; 
          box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
          color: #ef4444; 
          transform: scale(1.05); 
        }

        .hidden-input { display: none; }

        /* Template */
        .template-grid-wrap { margin-top: 0.5rem; }
        .template-label { font-size: 0.8rem; font-weight: 500; color: #6b7280; margin-bottom: 0.5rem; }
        .template-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.5rem;
        }

        .template-thumb {
          aspect-ratio: 1;
          border-radius: 10px;
          overflow: hidden;
          border: 2px solid transparent;
          cursor: pointer;
          padding: 0;
          background: none;
          transition: all 0.2s ease;
        }
        .template-thumb:hover {
          border-color: #ec4899;
          transform: scale(1.03);
        }
        .template-thumb img {
          width: 100%; height: 100%; object-fit: cover;
          display: block;
        }

        /* Style grid */
        .style-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .style-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.375rem;
          padding: 0.75rem 0.25rem;
          border-radius: 12px;
          border: 2px solid #e5e7eb;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .style-btn:hover {
          border-color: #f9a8d4;
          background: #fdf2f8;
        }

        .style-btn.selected {
          border-color: #ec4899;
          background: linear-gradient(135deg, #fdf2f8, #f5f3ff);
          box-shadow: 0 2px 10px rgba(236,72,153,0.2);
        }

        .style-icon { margin-bottom: 0.25rem; color: #ec4899; }
        .style-btn.selected .style-icon { color: #8b5cf6; }
        .style-name { font-size: 0.8125rem; font-weight: 700; color: #111827; font-family: 'Outfit', sans-serif;}

        /* Prompt */
        .prompt-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid #e5e7eb;
          border-radius: 12px;
          font-size: 0.9375rem;
          font-family: 'Inter', sans-serif;
          resize: vertical;
          transition: all 0.2s ease;
          color: #111827;
          background: #fafafa;
          line-height: 1.6;
        }
        .prompt-input:focus {
          outline: none;
          border-color: #ec4899;
          background: white;
          box-shadow: 0 0 0 4px rgba(236,72,153,0.1);
        }
        .prompt-input::placeholder { color: #9ca3af; }

        /* Usage bar */
        .usage-bar {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.5rem 0;
        }
        .usage-track {
          flex: 1;
          height: 6px;
          background: #f3f4f6;
          border-radius: 3px;
          overflow: hidden;
        }
        .usage-fill {
          height: 100%;
          background: linear-gradient(90deg, #ec4899, #8b5cf6);
          border-radius: 3px;
          transition: width 0.4s ease;
        }
        .usage-label { font-size: 0.75rem; color: #9ca3af; font-weight: 500; white-space: nowrap; }

        /* Generate button */
        .generate-btn {
          width: 100%;
          padding: 1.125rem;
          background: linear-gradient(135deg, #ec4899, #8b5cf6);
          color: white;
          border: none;
          border-radius: 14px;
          font-size: 1.0625rem;
          font-weight: 800;
          cursor: pointer;
          transition: all 0.25s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.625rem;
          box-shadow: 0 8px 25px rgba(236,72,153,0.3);
          font-family: 'Outfit', sans-serif;
          letter-spacing: 0.02em;
        }

        .generate-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(236,72,153,0.45);
        }

        .generate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-spinner-icon {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Result */
        .result-canvas {
          border: 2px solid #f3f4f6;
          border-radius: 16px;
          aspect-ratio: 1;
          background: #fafafa;
          background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
          background-size: 24px 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.02);
        }

        .result-loading, .result-empty {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .loading-anim {
          margin-bottom: 1rem;
          animation: float 2s ease-in-out infinite;
        }

        .loading-text {
          font-size: 1.0625rem;
          font-weight: 700;
          font-family: 'Outfit', sans-serif;
          color: #111827;
          margin-bottom: 0.5rem;
        }

        .loading-subtext { font-size: 0.8125rem; color: #9ca3af; }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        .result-image-wrap { width: 100%; height: 100%; position: relative; }
        .result-image { width: 100%; height: 100%; object-fit: contain; }

        .download-btn {
          position: absolute;
          bottom: 16px; right: 16px;
          padding: 0.625rem 1.25rem;
          background: rgba(255,255,255,0.85);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
          font-family: 'Outfit', sans-serif;
          color: #111827;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .download-btn:hover {
          background: white;
          box-shadow: 0 8px 25px rgba(0,0,0,0.15);
          transform: translateY(-2px);
          color: #ec4899;
        }

        .result-empty-icon { margin-bottom: 1rem; }
        .result-empty p { font-size: 0.9375rem; font-weight: 600; color: #4b5563; }
        .result-empty-sub { font-size: 0.8125rem; color: #9ca3af !important; margin-top: 0.375rem; font-weight: 400 !important; }

        @media (max-width: 640px) {
          .generator-grid { grid-template-columns: 1fr; }
          .style-grid { grid-template-columns: repeat(3, 1fr); }
          .template-grid { grid-template-columns: repeat(4, 1fr); }
          .toast-container { left: 1rem; right: 1rem; max-width: none; }
        }
      `}</style>
    </div>
  );
}
