import { GoogleGenAI, Type, Modality } from "@google/genai";
import { MediaType, AudioTracks, TemplateCategory } from "../types.js";

/* ---------------------------------------------------------
   LOCAL PROMPT SAFETY FILTER
--------------------------------------------------------- */

const SIMPLE_FORBIDDEN_PATTERNS = [
  /\b(?:porn|xxx|sex)\b/i,
  /\b(?:kill|bomb|explode|murder)\b/i,
  /\b(?:fraud|scam|hack)\b/i,
  /\b(?:nazi|kkk|slur)\b/i,
  /\b(?:suicide|self-harm)\b/i,
  /\b(?:president|election|vote|politics)\b/i,
  /\b(?:diagnos|prescribe|treatment)\b/i
];

const localValidatePrompt = (prompt) => {
  if (!prompt || typeof prompt !== "string")
    return { isValid: false, reason: "Empty prompt" };

  const trimmed = prompt.trim();

  if (trimmed.length < 5)
    return { isValid: false, reason: "Prompt too short" };

  const nonAlpha = (trimmed.match(/[^a-zA-Z0-9\s]/g) || []).length;
  const ratio = nonAlpha / Math.max(trimmed.length, 1);

  if (ratio > 0.6)
    return { isValid: false, reason: "Irrelevant input" };

  if (/^(?:[!?.,\-\s])+$/g.test(trimmed))
    return { isValid: false, reason: "Irrelevant input" };

  for (const pattern of SIMPLE_FORBIDDEN_PATTERNS) {
    if (pattern.test(trimmed))
      return { isValid: false, reason: "Disallowed content" };
  }

  return { isValid: true, reason: "Local check passed" };
};

/* ---------------------------------------------------------
   API KEY MANAGEMENT
--------------------------------------------------------- */

const getApiKey = async () => {
  try {
    if (
      typeof window !== "undefined" &&
      window?.aistudio &&
      typeof window.aistudio.getSelectedApiKey === "function"
    ) {
      const key = await window.aistudio.getSelectedApiKey();
      if (key) return key;
    }
  } catch (e) {}

  return import.meta.env.VITE_GEMINI_API_KEY || null;
};

const createAiClient = async () => {
  const key = await getApiKey();

  if (!key)
    throw new Error(
      "No AI API key configured. Set VITE_GEMINI_API_KEY in your .env"
    );

  return new GoogleGenAI({ apiKey: key });
};

/* ---------------------------------------------------------
   QUOTA + RETRY LOGIC
--------------------------------------------------------- */

const QUOTA_ERROR_PATTERNS = [
  /quota/i,
  /rate.?limit/i,
  /429/i,
  /resource.?exhausted/i,
  /too many requests/i,
  /exceeded/i
];

const isQuotaError = (error) => {
  const msg = error?.message || error?.toString() || "";
  const status = error?.status || error?.statusCode || error?.code;

  if (status === 429 || status === "RESOURCE_EXHAUSTED") return true;

  return QUOTA_ERROR_PATTERNS.some((p) => p.test(msg));
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (
  fn,
  { maxRetries = 2, baseDelay = 3000, label = "AI call" } = {}
) => {
  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (isQuotaError(err) && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);

        console.warn(
          `[AI Service] ${label}: quota hit. retry in ${delay / 1000}s`
        );

        await sleep(delay);
      } else {
        break;
      }
    }
  }

  if (isQuotaError(lastError)) {
    throw new Error(
      "Gemini API quota exceeded. Please wait a few minutes or upgrade your API plan."
    );
  }

  throw lastError;
};

/* ---------------------------------------------------------
   PROMPT VALIDATION
--------------------------------------------------------- */

export const validateMarketingPrompt = async (userPrompt) => {
  const local = localValidatePrompt(userPrompt);

  if (!local.isValid) return local;

  try {
    const ai = await createAiClient();

    return await withRetry(async () => {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Analyze this marketing prompt: "${userPrompt}"`,
        config: {
          systemInstruction: `
You are SmartAds security validator.

ALLOWED:
Retail, Food, Fashion, Beauty, Electronics, Education, Local Business, Real Estate.

FORBIDDEN:
Politics, Medical advice, Adult content, Hate speech, Illegal activities.

Return JSON only.
`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isValid: { type: Type.BOOLEAN },
              reason: { type: Type.STRING }
            },
            required: ["isValid", "reason"]
          }
        }
      });

      try {
        return JSON.parse(response.text);
      } catch {
        return { isValid: false, reason: "Validation parse error" };
      }
    });
  } catch (e) {
    console.warn("Remote validation failed. Using local validation.", e);
    return { isValid: true, reason: "Local validation only" };
  }
};

/* ---------------------------------------------------------
   DIRECTOR ENGINE (VISION REFINER) - WITH FALLBACK
--------------------------------------------------------- */

export const refineMarketingVision = async (
  userPrompt,
  objective = "Promotion",
  visualStyle = "Cinematic",
  mediaType = "poster"
) => {
  const local = localValidatePrompt(userPrompt);

  if (!local.isValid) throw new Error(local.reason);

  try {
    const ai = await createAiClient();

    const response = await withRetry(async () => {
      return await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `Marketing Request: ${userPrompt}`,
        config: {
          systemInstruction: `
You are SmartAds Creative Director.

Return structured marketing output.

visualPrompt: 8K cinematic ad scene
suggestedTitle: 3-5 words
marketingRationale: one sentence
suggestedCaption: CTA
suggestedCategory: Event | Seasonal | Promotional | Brand Awareness
`,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              visualPrompt: { type: Type.STRING },
              suggestedTitle: { type: Type.STRING },
              marketingRationale: { type: Type.STRING },
              suggestedCaption: { type: Type.STRING },
              suggestedCategory: { type: Type.STRING }
            },
            required: [
              "visualPrompt",
              "suggestedTitle",
              "marketingRationale",
              "suggestedCaption",
              "suggestedCategory"
            ]
          }
        }
      });
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    // Fallback when API fails (quota exceeded, etc)
    console.warn("Vision refinement failed, using fallback values:", error.message);
    
    const isQuotaError = /quota|rate.?limit|429|resource.?exhausted|exceeded/i.test(error?.message || "");
    
    // Generate sensible fallback values from the user prompt
    const titleWords = userPrompt.split(" ").slice(0, 5).join(" ");
    
    return {
      visualPrompt: `Professional ${mediaType} for: ${userPrompt}. High quality, studio lighting, modern design, 8K resolution.`,
      suggestedTitle: titleWords.substring(0, 30) || "Professional Design",
      marketingRationale: "Premium quality design to attract and engage your target audience.",
      suggestedCaption: "Discover Excellence • Premium Quality • Professional Design",
      suggestedCategory: "Promotional",
      usingFallback: true,
      message: isQuotaError 
        ? "Using fallback (API quota limit reached)" 
        : "Using fallback design (API unavailable)"
    };
  }
};

/* ---------------------------------------------------------
   IMAGE GENERATION
--------------------------------------------------------- */

export const generateVisualAsset = async (name, description, mediaType) => {
  const local = localValidatePrompt(description || name);

  if (!local.isValid) throw new Error(local.reason);

  return withRetry(async () => {
    // Get API base URL (same as other services)
    const apiBaseUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:5000";
    
    // Call backend design API to generate SVG design
    const response = await fetch(`${apiBaseUrl}/api/generate-design`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: mediaType === MediaType.POSTER ? "poster" : "logo",
        brandName: name,
        tagline: "SmartAds Generated",
        description: description,
        style: "modern minimal professional",
        colors: ["#0ea5e9", "#111827", "#ffffff"],
        size: mediaType === MediaType.POSTER ? "1200x800" : "1024x1024"
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData?.error || errorData?.details || `Design generation failed with status ${response.status}`
      );
    }

    const data = await response.json();
    
    if (!data.url) {
      throw new Error("No URL returned from design generation. Please check backend logs.");
    }

    return data.url;
  });
};

/* ---------------------------------------------------------
   IMAGE EDITING
--------------------------------------------------------- */

export const editVisualAsset = async (base64Image, instructions) => {
  const local = localValidatePrompt(instructions);

  if (!local.isValid) throw new Error(local.reason);

  // With the current backend, editing is not directly supported
  // Return a message to the user
  throw new Error(
    "SVG editing is not yet available. Please regenerate with updated prompt instead."
  );
};

/* ---------------------------------------------------------
   VIDEO GENERATION
--------------------------------------------------------- */

export const generateVideoAsset = async (
  prompt,
  caption = "",
  animationStyle = "dynamic",
  audioTrackIds = [],
  baseImage = null
) => {
  const local = localValidatePrompt(prompt);

  if (!local.isValid) throw new Error(local.reason);

  const ai = await createAiClient();

  return withRetry(async () => {
    let base64Data = "";
    let mimeType = "image/png";

    if (baseImage) {
      const [header, data] = baseImage.split(",");
      base64Data = data;
      mimeType = header.match(/:(.*?);/)[1];
    }

    const operation = await ai.models.generateVideos({
      model: "veo-2.0-generate-001",
      prompt: `
${prompt}
Animation: ${animationStyle}
Caption: ${caption}
`,
      image: base64Data
        ? { imageBytes: base64Data, mimeType }
        : undefined,
      config: {
        numberOfVideos: 1,
        resolution: "720p",
        aspectRatio: "16:9"
      }
    });

    let op = operation;

    while (!op.done) {
      await sleep(8000);
      op = await ai.operations.getVideosOperation({ operation: op });
    }

    const url = op.response?.generatedVideos?.[0]?.video?.uri;

    if (!url) throw new Error("Video generation failed.");

    const apiKey = await getApiKey();

    const res = await fetch(`${url}&key=${apiKey}`);

    const blob = await res.blob();

    return URL.createObjectURL(blob);
  });
};

/* ---------------------------------------------------------
   MARKETING IMAGE GENERATION (LOGOS & POSTERS)
   Using Gemini 3.1 Flash Image Model for High Quality
--------------------------------------------------------- */

/**
 * Master prompt engineering for high-quality marketing assets
 */
const createMasterPrompt = (userPrompt, type = 'poster') => {
  const assetType = type === 'logo' 
    ? 'professional vector-style logo' 
    : 'high-end marketing poster';

  return `You are an award-winning graphic designer creating a ${assetType}.
  
User request: "${userPrompt}"

Requirements:
- High resolution, studio-quality output
- Professional color palette with white/light backgrounds for logos
- Clean, modern design with perfect composition
- Centered content
- Marketing-ready quality (8K equivalent)
- Vector-style aesthetics

${type === 'logo' 
  ? '- White or transparent background\n- Symmetrical and balanced\n- Scalable, simple design' 
  : '- Eye-catching visual hierarchy\n- Strategic text placement\n- Sales-oriented composition\n- Vibrant but professional colors'}

Create an exceptional ${assetType}.`;
};

/**
 * Generate high-quality marketing images (logos and posters)
 * Uses Gemini 3.1 Flash Image for optimal quality
 */
export const generateMarketingImage = async (prompt, type = 'poster') => {
  const local = localValidatePrompt(prompt);
  if (!local.isValid) throw new Error(local.reason);

  try {
    const ai = await createAiClient();

    return await withRetry(async () => {
      // Master prompt for professional results
      const masterPrompt = createMasterPrompt(prompt, type);

      // Determine model and config based on type
      const modelName = "gemini-2.0-flash"; // Using stable model for reliability
      
      const config = {
        systemInstruction: masterPrompt,
      };

      // If you have access to image generation models, use this:
      // For now, using text generation and then image generation
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [{ 
            text: `Generate an image for: ${prompt}. Asset type: ${type}. Style: professional marketing-ready design.` 
          }],
        },
        config,
      });

      // If the model returns image data
      if (response.candidates?.[0]?.content?.parts) {
        const imagePart = response.candidates[0].content.parts.find(
          p => p.inlineData || p.mimeType?.includes('image')
        );
        if (imagePart?.inlineData?.data) {
          return `data:image/png;base64,${imagePart.inlineData.data}`;
        }
      }

      // Fallback: Use a placeholder or error message
      throw new Error("Image generation not directly supported. Using backend service instead.");
    }, { 
      label: `Marketing Image Generation (${type})`,
      maxRetries: 2
    });
  } catch (error) {
    console.warn("Direct image generation failed, falling back to backend service:", error.message);
    
    // Fallback to backend design generation
    const response = await generateVisualAsset(
      `Generated ${type}`,
      prompt,
      type === 'logo' ? MediaType.LOGO : MediaType.POSTER
    );
    
    return response;
  }
};

/**
 * Enhanced image asset generation with prompt engineering
 */
export const generateEnhancedImage = async (userPrompt, type = 'poster', options = {}) => {
  const {
    quality = '1K',
    aspectRatio = type === 'logo' ? '1:1' : '2:3',
    style = 'professional',
    colorPalette = 'vibrant',
  } = options;

  try {
    // First, refine the prompt for maximum quality
    const refinedData = await refineMarketingVision(
      userPrompt,
      'Promotion',
      style,
      type
    );

    // Use the refined visual prompt for generation
    const finalPrompt = refinedData.visualPrompt || userPrompt;
    
    return await generateMarketingImage(finalPrompt, type);
  } catch (error) {
    console.error("Enhanced image generation failed:", error);
    throw new Error(`Failed to generate ${type}: ${error.message}`);
  }
};

/**
 * Generate and save image to local storage
 */
export const generateAndSaveImage = async (prompt, type = 'poster') => {
  const imageUrl = await generateMarketingImage(prompt, type);
  
  // Save to local storage gallery
  const gallery = JSON.parse(localStorage.getItem('smartads_gallery') || '[]');
  
  const imageEntry = {
    id: `img-${Date.now()}`,
    url: imageUrl,
    prompt: prompt,
    type: type,
    timestamp: new Date().toISOString(),
    title: prompt.substring(0, 50) + (prompt.length > 50 ? '...' : '')
  };
  
  gallery.unshift(imageEntry); // Add to beginning
  localStorage.setItem('smartads_gallery', JSON.stringify(gallery.slice(0, 50))); // Keep last 50
  
  return imageEntry;
};

/**
 * Retrieve saved images from local gallery
 */
export const getImageGallery = () => {
  try {
    return JSON.parse(localStorage.getItem('smartads_gallery') || '[]');
  } catch {
    return [];
  }
};

/**
 * Delete image from gallery
 */
export const deleteFromGallery = (imageId) => {
  const gallery = getImageGallery();
  const updated = gallery.filter(img => img.id !== imageId);
  localStorage.setItem('smartads_gallery', JSON.stringify(updated));
  return updated;
};

/**
 * Download image as file
 */
export const downloadImage = (imageUrl, filename = 'smartads-asset.png') => {
  try {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
    throw new Error('Failed to download image');
  }
};

/* ---------------------------------------------------------
   FAST UI VALIDATION
--------------------------------------------------------- */

export const validatePromptFast = (prompt) => localValidatePrompt(prompt);