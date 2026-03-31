# SmartAds Image Generator Documentation

## Overview

The SmartAds Image Generator is now integrated into your Template Manager, enabling you to generate high-quality logos and posters locally using the Gemini API with a smooth, intuitive UI.

## Features

### ✨ Key Capabilities

1. **Logo Generation** - Create professional vector-style logos with 1:1 aspect ratio
2. **Poster Generation** - Design eye-catching marketing posters with 2:3 aspect ratio  
3. **High-Quality Output** - Leverages Gemini models for studio-quality results
4. **Local Gallery** - Automatically saves generated images to browser localStorage
5. **Instant Download** - Download generated assets directly to your computer
6. **Prompt Engineering** - Built-in master prompts for professional results

### 📋 How It Works

#### Accessing the Image Generator

1. Navigate to the **Template Manager** dashboard
2. Click the **"Generate Image"** button in the header
3. The Image Generator modal will open with a split-panel interface

#### Generating Images

1. **Describe Your Design**
   - Use the text area to describe what you want to create
   - Be specific about style, colors, and mood
   - Examples:
     - "Modern minimalist logo for a coffee shop with white background"
     - "Summer sale poster with tropical leaves and vibrant neon colors"

2. **Choose Asset Type**
   - Click **Logo** for 1:1 aspect ratio designs
   - Click **Poster** for 2:3 aspect ratio promotional designs

3. **Wait for Generation**
   - Generation typically takes 5-10 seconds
   - A spinner indicates the process is in progress
   - The result appears in the preview panel on the left

#### Managing Generated Images

1. **Download** - Click the "Download Asset" button to save the image
2. **View Gallery** - Access previously generated images via "View Gallery"
3. **Reuse** - Click any gallery item to make it the current preview
4. **Delete** - Remove unwanted images from gallery

## Technical Implementation

### Architecture

```
ImageGenerator Component
├── Input Panel (Right)
│   ├── Prompt textarea
│   ├── Pro tips section
│   └── Generate buttons
├── Preview Panel (Left)
│   ├── Image display
│   ├── Download button
│   └── Gallery viewer
└── Local Storage
    └── Smart gallery system
```

### Services Integration

#### aiService.js Functions

```javascript
// Main generation function
generateMarketingImage(prompt, type = 'poster')
// Generates high-quality image using Gemini API
// Returns: base64 data URL

// Enhanced generation with prompt refinement
generateEnhancedImage(userPrompt, type, options)
// Refines prompt before generation for better results
// Returns: refined image URL

// Gallery management
generateAndSaveImage(prompt, type)      // Generate + save to gallery
getImageGallery()                        // Retrieve saved images
deleteFromGallery(imageId)              // Remove from gallery
downloadImage(imageUrl, filename)       // Download to user's device
```

### Configuration

The image generator is automatically configured with:

- **API Key**: Read from environment variable `VITE_GEMINI_API_KEY` 
- **Model**: Uses Gemini 2.0 Flash for optimal speed/quality balance
- **Storage**: Browser localStorage with 50-image limit
- **Aspect Ratios**:
  - Logos: 1:1
  - Posters: 2:3
- **Image Size**: 1K resolution (scalable)

### Pro Tips for Best Results

#### For Logos

- Describe the business or brand
- Specify if you want geometric, organic, or minimalist style
- Mention preferred colors
- Example: "Professional tech company logo, blue and white, modern geometric style"

#### For Posters

- Include text or CTA you want highlighted
- Describe the visual mood (energetic, elegant, playful)
- Mention target audience
- Example: "Summer sale poster, tropical vibes, bright colors, family-friendly"

## Local Storage System

### Gallery Structure

The gallery is stored as a JSON array in `localStorage['smartads_gallery']`:

```javascript
[
  {
    id: 'img-1234567890',
    url: 'data:image/png;base64,...',
    type: 'logo',
    prompt: 'Modern minimalist logo for a coffee shop',
    timestamp: '2026-03-31T10:30:00.000Z',
    title: 'Modern minimalist logo for a...'
  },
  // ... more images up to 50 total
]
```

### Storage Limits

- **Max images stored**: 50 (oldest are removed when limit exceeded)
- **Storage location**: Browser's localStorage
- **Persistence**: Survives browser refresh, cleared only on cache clear

## Error Handling

### Common Errors and Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| "No AI API key configured" | Missing `VITE_GEMINI_API_KEY` | Check `.env.local` file |
| "API quota exceeded" | Too many requests in short time | Wait a few minutes, check API limits |
| "Empty prompt" | Blank input | Enter a description before generating |
| "Failed to download" | Browser security issue | Try a different browser or check download folder permissions |

### Rate Limiting

If you hit API quota limits:
- System automatically retries with exponential backoff
- Maximum 2 retry attempts with 3-6 second delays
- User is notified with a quota error message

## Integration with Template Manager

### Workflow Integration

1. **Generate in Image Generator** → Create and refine assets
2. **Download or Use** → Save to computer or copy to clipboard
3. **Optional: Add to Template** → Use the URL in template editor
4. **Create/Edit Template** → Incorporate generated image

### Future Enhancement Ideas

- [ ] Copy image URL to clipboard without downloading
- [ ] Batch generation (multiple templates at once)
- [ ] Cloud backup of gallery
- [ ] AI-powered prompt suggestions
- [ ] Image editing/refinement API
- [ ] Social media size presets (Instagram, Facebook, Twitter)

## Deployment Checklist

Before deploying to production:

- [ ] Verify `VITE_GEMINI_API_KEY` is set in production `.env`
- [ ] Test image generation on target device
- [ ] Check localStorage capacity on target browser
- [ ] Verify CORS allows Gemini API calls
- [ ] Test download functionality
- [ ] Ensure CSS animations are smooth
- [ ] Test gallery scrolling on mobile

## Troubleshooting

### Images Not Generating

1. Check browser console for errors (F12 → Console tab)
2. Verify API key in `.env.local`
3. Check network tab to see if API call is made
4. Try a simpler prompt
5. Clear browser cache and retry

### Gallery Not Saving

1. Ensure localStorage is enabled
2. Check if browser is in private/incognito mode (localStorage disabled)
3. Verify enough disk space available
4. Try clearing old gallery: Open DevTools → Application → Storage → localStorage

### Download Not Working

1. Check browser download settings
2. Try disabling ad blockers
3. Ensure sufficient disk space
4. Test on different browser

## API Reference

### generateMarketingImage(prompt, type)

Generate a high-quality marketing image.

**Parameters:**
- `prompt` (string): Description of desired image
- `type` (string): 'logo' or 'poster'

**Returns:** Promise<string> - Base64 data URL

**Example:**
```javascript
const imageUrl = await generateMarketingImage(
  'Modern minimalist coffee logo',
  'logo'
);
```

### generateAndSaveImage(prompt, type)

Generate image and automatically save to gallery.

**Parameters:**
- `prompt` (string): Image description
- `type` (string): 'logo' or 'poster'

**Returns:** Promise<Object> - Image entry with id, url, timestamp

### getImageGallery()

Retrieve all saved images from localStorage.

**Returns:** Array<Object> - Array of image entries

**Example:**
```javascript
const gallery = getImageGallery();
console.log(`${gallery.length} images saved`);
```

### deleteFromGallery(imageId)

Remove an image from saved gallery.

**Parameters:**
- `imageId` (string): Image ID to remove

**Returns:** Array<Object> - Updated gallery

### downloadImage(imageUrl, filename)

Download image to user's device.

**Parameters:**
- `imageUrl` (string): Image data URL or image URL
- `filename` (string): Desired filename

**Returns:** void

## Performance Notes

- **Generation Speed**: 5-10 seconds typically
- **Gallery Load**: < 100ms
- **Storage Size**: ~3-5MB per 10 images
- **UI Response**: All interactions <200ms

## Browser Support

- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile Browsers: ✅ Supported with responsive design
- Private/Incognito Mode: ❌ localStorage not available

## Environment Variables

Required in `.env.local`:

```env
VITE_GEMINI_API_KEY=your_api_key_here
VITE_API_URL=http://localhost:5000
```

## Related Files

- [aiService.js](../services/aiService.js) - Image generation logic
- [ImageGenerator.jsx](./ImageGenerator.jsx) - UI component
- [TemplateManager.jsx](./TemplateManager.jsx) - Main component integration
- [index.css](../styles/index.css) - Animations and styles

## Support & Feedback

For issues or feature requests, please contact the development team or open an issue in the repository.

---

**Last Updated**: March 31, 2026
**Version**: 1.0.0
