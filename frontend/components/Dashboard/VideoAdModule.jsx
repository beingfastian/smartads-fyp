import React, { useState } from 'react';
import { videoAdAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

const initialProduct = {
  productName: '',
  productDescription: '',
  productPrice: '',
  productCategory: '',
  brandName: '',
  targetAudience: '',
  keyFeatures: '',
  callToAction: '',
};

const VideoAdModule = () => {
  const { colors, mode } = useTheme();
  const [product, setProduct] = useState(initialProduct);
  const [enhancedPrompt, setEnhancedPrompt] = useState(''); // Stores professional AI text
  const [images, setImages] = useState([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [step, setStep] = useState('form'); // form | preview | video
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduct((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setEnhancedPrompt('');
    
    // UI Experience messages
    setStatusMessage('Step 1/2: Enhancing your prompt & cleaning language...');
    
    try {
        // --- CALL ENHANCEMENT API FIRST ---
        const enhanceRes = await videoAdAPI.enhancePrompt(product);
        setEnhancedPrompt(enhanceRes.enhancedPrompt);
        
        // --- CALL GENERATION API SECOND ---
        setStatusMessage('Step 2/2: Applying Quality Filters & Generating Images...');
        const res = await videoAdAPI.generateImages({ enhancedPrompt: enhanceRes.enhancedPrompt });
        
        setImages(res.images || []);
        setStep('preview');
    } catch (err) {
        alert('Process Failed: ' + err.message);
    } finally {
        setLoading(false);
        setStatusMessage('');
    }
  };

  const handleGenerateVideo = async () => {
    setLoading(true);
    setStatusMessage('Generating professional video from assets...');
    try {
        const res = await videoAdAPI.generateVideo({ image_urls: images });
        setVideoUrl(res.video_url);
        setStep('video');
    } catch (err) {
        alert('Video Generation Failed: ' + err.message);
    } finally {
        setLoading(false);
        setStatusMessage('');
    }
  };

  const handleEdit = () => {
    setStep('form');
  };

  const handleRegenerate = async () => {
    setLoading(true);
    setStatusMessage('Regenerating new high-quality variations...');
    try {
        const res = await videoAdAPI.generateImages({ enhancedPrompt: enhancedPrompt });
        setImages(res.images || []);
    } catch (err) {
        alert('Regeneration failed: ' + err.message);
    } finally {
        setLoading(false);
        setStatusMessage('');
    }
  };

  return (
    <div
      style={{
        background: colors.cardBg,
        borderRadius: 18,
        boxShadow: mode === 'dark' ? '0 8px 32px #00005355' : '0 8px 32px #0088CC22',
        padding: '32px 24px',
        maxWidth: 1100,
        margin: '0 auto',
        color: colors.text1,
        fontFamily: 'Poppins, Arial, sans-serif',
        animation: 'fadeIn 0.5s',
        overflowY: 'auto',
        maxHeight: '80vh',
        scrollbarWidth: 'thin',
        scrollbarColor: `${colors.primary} ${colors.bg2}`,
      }}
      className="custom-scrollbar"
    >
      {/* STATUS LOADING OVERLAY */}
      {loading && (
        <div style={{ 
            background: colors.bg2, padding: '15px', borderRadius: '8px', 
            marginBottom: '15px', borderLeft: `4px solid ${colors.accent}`,
            position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
        }}>
            <div style={{ color: colors.accent, fontWeight: 700 }}>
                <span className="spinner">⏳</span> {statusMessage}
            </div>
            {enhancedPrompt && (
                <div style={{ marginTop: 8, fontSize: '0.85rem', color: colors.text2, background: 'rgba(0,0,0,0.03)', padding: '8px', borderRadius: 6 }}>
                    <strong>AI Creative Director:</strong> "{enhancedPrompt}"
                </div>
            )}
        </div>
      )}

      <h2 style={{ fontWeight: 700, fontSize: '2rem', marginBottom: 24, color: colors.primary }}>Video Advertisement Module</h2>
      
      {step === 'form' && (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          {/* Left: Product Details Form */}
          <form
            onSubmit={handleSubmit}
            style={{
              flex: 1, minWidth: 420, maxWidth: 520, borderRadius: 14,
              padding: '32px 28px', background: mode === 'dark' ? 'rgba(0,0,83,0.18)' : '#F8FAFC',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 22,
            }}
          >
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 8 }}>Product Details</div>
            <div style={{ color: colors.text2, fontSize: '0.95rem', marginBottom: 12 }}>
              Enter your product information. AI will clean the prompt and generate 8k images.
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Product Name</div>
                <input name="productName" placeholder="e.g., Wireless Headphones" value={product.productName} onChange={handleChange} required style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '1rem' }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Category</div>
                <input name="productCategory" placeholder="e.g., Electronics" value={product.productCategory} onChange={handleChange} required style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '1rem' }} />
              </div>
            </div>

            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Product Description</div>
            <textarea name="productDescription" placeholder="Describe in detail (Simple words or Roman Urdu allowed)..." value={product.productDescription} onChange={handleChange} required style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '1rem', minHeight: 60 }} />

            <div style={{ fontWeight: 600, fontSize: '1rem' }}>Key Features</div>
            <textarea name="keyFeatures" placeholder="Noise cancellation, 30-hour battery..." value={product.keyFeatures} onChange={handleChange} required style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}`, fontSize: '1rem', minHeight: 48 }} />

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Target Audience</div>
                <input name="targetAudience" placeholder="e.g., Professionals" value={product.targetAudience} onChange={handleChange} style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}` }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Price</div>
                <input name="productPrice" placeholder="e.g., $199" value={product.productPrice} onChange={handleChange} style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}` }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>Brand Name</div>
                <input name="brandName" placeholder="BrandX" value={product.brandName} onChange={handleChange} style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}` }} />
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ fontWeight: 600, fontSize: '1rem' }}>CTA Text</div>
                <input name="callToAction" placeholder="Shop Now" value={product.callToAction} onChange={handleChange} style={{ padding: '12px', borderRadius: 8, border: `1px solid ${colors.border}` }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 12, padding: '14px 0', borderRadius: 8, fontWeight: 700, fontSize: '1.1rem', border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, color: '#fff',
                boxShadow: `0 4px 16px ${colors.primary}33`, transition: '0.3s',
              }}
            >
              {loading ? 'AI Processing...' : 'Generate Images'}
            </button>
          </form>

          {/* Right: Preview & Logic Instructions */}
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 8 }}>AI Transformation Preview</div>
            <div style={{ minHeight: 180, background: mode === 'dark' ? 'rgba(0,0,83,0.12)' : '#F3F4F6', borderRadius: 12, border: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18, color: colors.text2, padding: 20 }}>
              {enhancedPrompt ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: colors.primary, fontWeight: 700, marginBottom: 10 }}>Professional English Prompt Generated:</div>
                  <p style={{ fontStyle: 'italic', fontSize: '1.05rem' }}>"{enhancedPrompt}"</p>
                </div>
              ) : (
                'Submit the form. AI will clean vulgarity and create a cinematic 8k prompt here.'
              )}
            </div>

            <div style={{ background: mode === 'dark' ? 'rgba(0,0,83,0.09)' : '#F8FAFC', borderRadius: 10, border: `1px solid ${colors.border}`, padding: '18px 14px', color: colors.text2, fontSize: '0.98rem' }}>
              <div style={{ fontWeight: 700, color: colors.text1, marginBottom: 6 }}>Active Modules:</div>
              <ul style={{ margin: '8px 0 0 18px' }}>
                <li>✨ <strong>One-Shot Enhancement:</strong> Translates & Improves details.</li>
                <li>🚫 <strong>Safety Filter:</strong> Removes vulgar or offensive words.</li>
                <li>🛠️ <strong>Negative Prompting:</strong> Prevents blurs and distortions.</li>
                <li>🎥 <strong>Video Logic:</strong> Stitches images at 1 FPS.</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 340 }}>
            <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: 8 }}>Generated Assets</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
              {images.map((url, idx) => (
                <img key={idx} src={url} alt={`Gen ${idx}`} style={{ width: 140, height: 100, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', objectFit: 'cover' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={handleGenerateVideo} style={{ flex: 2, padding: '14px', borderRadius: 8, background: colors.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Generate Video Ad</button>
                <button onClick={handleRegenerate} style={{ flex: 1, padding: '14px', borderRadius: 8, background: colors.accent, color: '#fff', border: 'none', cursor: 'pointer' }}>Regenerate</button>
            </div>
            <button onClick={handleEdit} style={{ marginTop: 12, width: '100%', padding: '10px', borderRadius: 8, background: 'transparent', color: colors.text1, border: `1px solid ${colors.border}`, cursor: 'pointer' }}>Edit Details</button>
          </div>
        </div>
      )}

      {step === 'video' && videoUrl && (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontWeight: 600, fontSize: '1.5rem', marginBottom: 20 }}>Your Marketing Video is Ready</div>
          <video src={videoUrl} controls width={600} style={{ borderRadius: 15, border: `5px solid ${colors.primary}`, boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }} />
          <div style={{ marginTop: 24 }}>
             <button onClick={handleEdit} style={{ padding: '12px 40px', borderRadius: 8, background: colors.primary, color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>Create Another Ad</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoAdModule;