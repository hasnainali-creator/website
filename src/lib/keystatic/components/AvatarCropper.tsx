import React, { useState, useCallback, useRef, useEffect } from 'react';
import Cropper from 'react-easy-crop';
import { Upload, X, Check, Crop, RotateCcw } from 'lucide-react';

// Use basic form field structure since fields.custom is missing in this version
export const authorsAvatarField = () => ({
  kind: 'form' as const,
  label: "Profile Picture (Avatar)",
  Input: (props: any) => {
    const { value, onChange } = props;
    
    // Get slug from URL: /keystatic/collection/editorial/item/[slug]
    const pathParts = typeof window !== 'undefined' ? window.location.pathname.split('/') : [];
    const slug = pathParts[pathParts.length - 1] || 'unknown';
    
    // Image selection & Modal State
    const [image, setImage] = useState<string | null>(null);
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
    const [isCropping, setIsCropping] = useState(false);
    
    // Save/Upload states
    const [pendingBlob, setPendingBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up Blob URLs to prevent memory leaks
    useEffect(() => {
        return () => {
            if (previewUrl && previewUrl.startsWith('blob:')) {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    const onCropComplete = useCallback((_croppedArea: any, croppedAreaPixels: any) => {
      setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          setImage(reader.result as string);
          setIsCropping(true);
        });
        reader.readAsDataURL(file);
        // Reset input so same file can be selected again if needed
        e.target.value = '';
      }
    };

    const createImage = (url: string): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const image = new Image();
        image.addEventListener('load', () => resolve(image));
        image.addEventListener('error', (error) => reject(error));
        image.setAttribute('crossOrigin', 'anonymous');
        image.src = url;
      });

    const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<Blob | null> => {
      const image = await createImage(imageSrc);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) return null;

      // PERFORMANCE OPTIMIZATION: Auto-Resize to 600x600 (High-Density Retina Quality)
      const TARGET_SIZE = 600;
      canvas.width = TARGET_SIZE;
      canvas.height = TARGET_SIZE;

      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        TARGET_SIZE,
        TARGET_SIZE
      );

      return new Promise((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob);
        }, 'image/jpeg', 0.9);
      });
    };

    // Stage 1: Generate Local Preview (No Upload yet)
    const handleApplyLocal = async () => {
        if (!image || !croppedAreaPixels) return;
        try {
            const blob = await getCroppedImg(image, croppedAreaPixels);
            if (!blob) return;
            
            const url = URL.createObjectURL(blob);
            setPendingBlob(blob);
            setPreviewUrl(url);
            setIsCropping(false);
            // We NO LONGER set image to null here, so it can be re-adjusted
        } catch (e) {
            console.error(e);
            alert("Failed to create preview.");
        }
    };

    // Stage 2: Commit to Server (The "Real" Save)
    const handleFinalConfirm = async () => {
      if (!pendingBlob) return;
      setIsUploading(true);

      try {
        const response = await fetch('/api/upload-author-avatar', {
          method: 'POST',
          headers: {
            'X-Author-Slug': slug
          },
          body: pendingBlob,
        });

        const text = await response.text();
        let result;
        try {
            result = JSON.parse(text);
        } catch (e) {
            alert(`Server error (${response.status}). Log: ${text.substring(0, 40)}`);
            return;
        }

        if (result.success) {
          onChange(result.path);
          setPendingBlob(null);
          setPreviewUrl(null);
          setImage(null); // Finally clear the source image after successful save
        } else {
          alert(`Error: ${result.error}`);
        }
      } catch (err: any) {
        alert("Upload failed. Check connection.");
      } finally {
        setIsUploading(false);
      }
    };

    const handleCancelPreview = () => {
        setPendingBlob(null);
        setPreviewUrl(null);
        setImage(null); // Clear source on explicit cancel
    };

    const handleOpenCropper = () => {
        setIsCropping(true);
    };

    // UI Styles (Keystatic Native Theme)
    const buttonBaseStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.4rem',
        padding: '0.4rem 0.8rem',
        borderRadius: '6px',
        fontSize: '0.875rem',
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        fontFamily: 'Inter, system-ui, sans-serif'
    };

    const secondaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: '#ffffff',
        color: '#0f172a',
        border: '1px solid #cbd5e1',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    };

    const primaryButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: '#2563eb',
        color: '#ffffff',
        border: 'none',
        boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.1), 0 2px 4px -1px rgba(37, 99, 235, 0.06)'
    };

    const dangerButtonStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        backgroundColor: 'transparent',
        color: '#ef4444',
        border: '1px solid #fee2e2'
    };

    return (
      <div style={{ marginBottom: '1.5rem', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#334155', marginBottom: '0.6rem' }}>
            Profile Picture (Avatar)
        </label>
        
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                style={secondaryButtonStyle}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
            >
                <Upload size={15} color="#64748b" />
                {value || previewUrl ? "Change Picture" : "Choose Picture"}
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onFileChange} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />
            
            {/* Show "Confirm Save" button if there is a pending crop */}
            {previewUrl && (
                <>
                <button
                    type="button"
                    onClick={handleFinalConfirm}
                    disabled={isUploading}
                    style={primaryButtonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
                >
                    {isUploading ? "Saving..." : <><Check size={16} /> Confirm & Save to Disk</>}
                </button>
                <button
                    type="button"
                    onClick={handleCancelPreview}
                    style={dangerButtonStyle}
                    onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                    <X size={15} /> Cancel
                </button>
                </>
            )}
            
            {(value || previewUrl) && !isUploading && (
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' }}>
                    {previewUrl ? "* Preview Mode: Click Confirm to finalize" : "Saved"}
                </span>
            )}
        </div>

        {/* Preview Display */}
        {(value || previewUrl) && !isCropping && (
            <div style={{ marginTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ 
                    position: 'relative', 
                    width: '144px', 
                    height: '144px', 
                    borderRadius: '50%', // Circular preview for better author look
                    overflow: 'hidden', 
                    border: previewUrl ? '3px solid #3b82f6' : '1px solid #e2e8f0', 
                    backgroundColor: '#f8fafc',
                    boxShadow: previewUrl ? '0 10px 15px -3px rgba(0, 0, 0, 0.1)' : 'none'
                }}>
                    <img 
                        src={previewUrl ? previewUrl : value.replace('@assets', '/src/assets')} 
                        alt="Avatar Preview" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    
                    {/* Re-crop overlay button for pending state */}
                    {previewUrl && (
                        <button
                            type="button"
                            onClick={handleOpenCropper}
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(15, 23, 42, 0.4)',
                                border: 'none',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                cursor: 'pointer',
                                opacity: 0,
                                transition: 'opacity 0.2s ease',
                                fontSize: '0.75rem',
                                fontWeight: 600
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.opacity = '1')}
                            onMouseOut={(e) => (e.currentTarget.style.opacity = '0')}
                        >
                            <RotateCcw size={16} /> Adjust Selection
                        </button>
                    )}
                </div>
                
                {/* Secondary 'Edit Crop' button for accessibility and clarity */}
                {previewUrl && (
                     <button
                        type="button"
                        onClick={handleOpenCropper}
                        style={{ ...secondaryButtonStyle, width: 'fit-content' }}
                    >
                        <RotateCcw size={14} /> Re-Adjust Crop
                    </button>
                )}
            </div>
        )}

        {/* Cropper Modal */}
        {isCropping && image && (
          <div style={{ 
            position: 'fixed', 
            top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.7)', 
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <div style={{ 
                width: '560px', 
                maxWidth: '92vw',
                backgroundColor: '#ffffff', 
                borderRadius: '16px', 
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Header */}
                <div style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600, color: '#0f172a' }}>Personalize Avatar</h3>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#64748b' }}>Crop your photo to a perfect square</p>
                    </div>
                    <button onClick={() => setIsCropping(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: '0.5rem', borderRadius: '50%' }}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body (Cropper Area) */}
                <div style={{ position: 'relative', height: '380px', backgroundColor: '#0f172a' }}>
                    <Cropper
                        image={image}
                        crop={crop}
                        zoom={zoom}
                        aspect={1 / 1}
                        onCropChange={setCrop}
                        onCropComplete={onCropComplete}
                        onZoomChange={setZoom}
                        style={{ 
                            containerStyle: { backgroundColor: '#0f172a' },
                            cropAreaStyle: { border: '2px solid #2563eb' }
                         }}
                    />
                </div>
                
                {/* Visual Controls */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', backgroundColor: '#ffffff', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '0.875rem', fontWeight: 500 }}>
                        <Crop size={16} />
                        <span>Zoom</span>
                    </div>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.05}
                        onChange={(e: any) => setZoom(parseFloat(e.target.value))}
                        style={{ 
                            cursor: 'pointer', 
                            flex: 1, 
                            accentColor: '#2563eb',
                            height: '4px',
                            borderRadius: '2px'
                        }}
                    />
                    <button 
                        onClick={() => setZoom(1)} 
                        style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', display: 'flex' }}
                        title="Reset Zoom"
                    >
                        <RotateCcw size={16} />
                    </button>
                </div>

                {/* Footer (Action Bar) */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
                    <button
                        type="button"
                        onClick={() => setIsCropping(false)}
                        style={secondaryButtonStyle}
                    >
                        Discard
                    </button>
                    <button
                        type="button"
                        onClick={handleApplyLocal}
                        style={primaryButtonStyle}
                    >
                        <Check size={16} /> Apply Settings
                    </button>
                </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  defaultValue: () => "",
  parse: (value: any) => value || "",
  serialize: (value: any) => ({ value }),
  validate: (value: any) => value,
  reader: {
    parse: (value: any) => value || "",
  }
});
