"""
Design Service - Business logic for logo and poster generation
"""

import os
import re
from datetime import datetime
from werkzeug.utils import secure_filename

import cloudinary
import cloudinary.uploader
import google.generativeai as genai

from config.settings import (
    CLOUD_NAME,
    CLOUD_API_KEY,
    CLOUD_API_SECRET,
    GEMINI_API_KEY,
    UPLOAD_FOLDER
)

from config.database import db


class DesignService:
    """
    Service class responsible for:
    - AI design generation
    - SVG validation
    - Cloudinary upload
    - Database storage
    """

    # -----------------------------------------------------------
    # Configure External APIs
    # -----------------------------------------------------------

    @staticmethod
    def configure_clients():
        """Configure Gemini and Cloudinary"""

        if not GEMINI_API_KEY:
            raise RuntimeError("Missing environment variable: GEMINI_API_KEY")

        if not CLOUD_NAME or not CLOUD_API_KEY or not CLOUD_API_SECRET:
            raise RuntimeError("Missing Cloudinary configuration")

        # Configure Gemini AI
        genai.configure(api_key=GEMINI_API_KEY)

        # Configure Cloudinary
        cloudinary.config(
            cloud_name=CLOUD_NAME,
            api_key=CLOUD_API_KEY,
            api_secret=CLOUD_API_SECRET,
            secure=True,
        )

    # -----------------------------------------------------------
    # Build Prompt for Gemini
    # -----------------------------------------------------------

    @staticmethod
    def build_svg_prompt(payload: dict) -> str:
        """Create an ultra-detailed prompt for generating premium professional SVG designs"""

        design_type = payload.get("type", "logo")
        brand_name = payload.get("brandName", "SmartAds")
        tagline = payload.get("tagline", "")
        style = payload.get("style", "modern minimal")
        description = payload.get("description", "").lower()
        colors = payload.get("colors")
        size = payload.get("size", "1024x1024")

        if isinstance(colors, list):
            primary = colors[0]
            secondary = colors[1] if len(colors) > 1 else colors[0]
            accent = colors[2] if len(colors) > 2 else colors[0]
            palette = ", ".join(colors[:3])
        else:
            palette = colors or "#0ea5e9, #111827, #ffffff"
            primary, secondary, accent = palette.split(", ")[:3]

        width, height = (size.split("x") + ["1024", "1024"])[:2]

        if design_type.lower() == "logo":
            system_rules = """You are a MASTER logo designer with 20+ years of luxury brand experience.
Create PROFESSIONAL, PREMIUM logos in pure SVG format.

CRITICAL REQUIREMENTS:
- Return ONLY complete, valid SVG code (start with <svg, end with </svg>)
- NO explanations, NO markdown, NO backticks, NO code blocks
- Design must be sophisticated, elegant, and memorable
- Perfect for favicon, business cards, website header
- Use professional gradients, shadows, and effects
- Scalable to any size without quality loss
- Include subtle design details that convey premium quality"""

            instructions = f"""Create an EXCEPTIONAL, LUXURY logo for: {brand_name}

BRAND IDENTITY:
- Business: {description}
- Brand Name: {brand_name}
- Tagline: {tagline}
- Style: Premium {style}

COLOR PALETTE (use successfully):
- Primary: {primary}
- Secondary: {secondary}
- Accent: {accent}

DESIGN SPECIFICATIONS:
- Dimensions: {width}x{height}
- Design Type: ICON + TEXT LOGO
- Quality: PREMIUM luxury brand standard

LOGO DESIGN REQUIREMENTS:
✓ Create a DISTINCTIVE, MEMORABLE icon that represents the brand essence
✓ Icon must be CREATIVE and UNIQUE to "{description}"
✓ Professional typography for "{brand_name}" 
✓ Use color palette sophisticatedly (NOT all colors at once)
✓ Add subtle depth: gradients, shadows, or embossing effects
✓ Ensure perfect balance between icon and text
✓ Modern, elegant, scalable vector design
✓ Suitable for print and digital media
✓ Make it look PREMIUM and PROFESSIONAL

TECHNICAL SVG REQUIREMENTS:
- Use <defs> for gradients and filters
- Add subtle drop shadows or glows for depth
- Use proper font styling for text
- Include viewBox for scalability
- Use curves and bezier paths for smooth shapes
- Optimize performance without sacrificing quality

Generate a LUXURY BRAND QUALITY logo now."""

        else:  # poster
            system_rules = """You are a MASTER poster/campaign designer for premium brands.
Create STRIKING, PROFESSIONAL posters in pure SVG format.

CRITICAL REQUIREMENTS:
- Return ONLY complete, valid SVG code (start with <svg, end with </svg>)
- NO explanations, NO markdown, NO backticks, NO code blocks
- Design must be eye-catching, balanced, and professional
- Suitable for billboard, social media, print marketing
- Use dynamic composition, layered elements, and visual hierarchy
- Professional typography and spacing
- Marketing-ready quality"""

            instructions = f"""Create an EXCEPTIONAL, MARKETING CAMPAIGN poster for: {brand_name}

CAMPAIGN INFO:
- Brand/Concept: {description}
- Campaign Title: {brand_name}
- Tagline/Message: {tagline}
- Style: Premium {style}

COLOR PALETTE (use strategically):
- Primary: {primary}
- Secondary: {secondary}
- Accent: {accent}

POSTER SPECIFICATIONS:
- Dimensions: {width}x{height}
- Design Type: MARKETING POSTER
- Quality: PROFESSIONAL campaign standard

POSTER DESIGN REQUIREMENTS:
✓ Create a VISUALLY STUNNING, EYE-CATCHING composition
✓ Design must represent "{description}" concept powerfully
✓ Large, bold "{brand_name}" as main focal point
✓ Include "{tagline}" as secondary text if provided
✓ Use color palette for maximum visual impact
✓ Layered design with geometric elements, shapes, or illustrations
✓ Professional typography hierarchy (headline > subtext)
✓ Modern, sophisticated layout with white space
✓ Suitable for printing and digital display
✓ Make it look like a PREMIUM LUXURY BRAND campaign

TECHNICAL SVG REQUIREMENTS:
- Use <defs> for gradients, patterns, and filters
- Multiple layers for depth and visual interest
- Professional text styling and kerning
- Dynamic background with geometric elements or textures
- Add subtle effects: shadows, glows, or gradients
- Include viewBox for responsive scaling
- Optimize for both web and print

Generate a LUXURY CAMPAIGN POSTER now."""

        return system_rules + "\n" + instructions

    # -----------------------------------------------------------
    # Extract SVG From AI Response
    # -----------------------------------------------------------

    @staticmethod
    def extract_svg(text: str) -> str:
        """Extract valid SVG markup from AI response"""

        if not text:
            return ""

        # Remove markdown formatting if Gemini adds it
        text = re.sub(r"```(?:svg)?", "", text)
        text = text.replace("```", "")

        match = re.search(r"<svg[\s\S]*?</svg>", text, re.IGNORECASE)

        if match:
            return match.group(0).strip()

        return ""

    # -----------------------------------------------------------
    # PREMIUM Advanced Fallback SVG Generator
    # -----------------------------------------------------------

    @staticmethod
    def generate_advanced_fallback(data: dict) -> str:
        """Generate PREMIUM, luxury-quality SVG designs"""
        import hashlib
        
        design_type = data.get("type", "logo").lower()
        brand_name = data.get("brandName", "Brand")
        description = (data.get("description", "") or "").lower()
        size = data.get("size", "1024x1024")
        colors = data.get("colors", ["#0ea5e9", "#1e40af", "#f59e0b"])

        width, height = (size.split("x") + ["1024", "1024"])[:2]
        width, height = int(width), int(height)

        # Parse colors with safety checks
        primary = colors[0] if isinstance(colors, list) and len(colors) > 0 else "#0ea5e9"
        secondary = colors[1] if isinstance(colors, list) and len(colors) > 1 else "#1e40af"
        accent = colors[2] if isinstance(colors, list) and len(colors) > 2 else "#f59e0b"

        # Create unique hash for design variation and uniqueness
        input_hash = hashlib.md5(f"{brand_name}{description}".encode()).hexdigest()
        variant = int(input_hash, 16) % 30  # 30 premium design variants

        if design_type == "poster":
            return DesignService._generate_premium_poster(brand_name, description, primary, secondary, accent, width, height, variant)
        else:
            return DesignService._generate_premium_logo(brand_name, description, primary, secondary, accent, width, height, variant)

    @staticmethod
    def _generate_premium_logo(brand_name, description, primary, secondary, accent, width, height, variant):
        """Generate PREMIUM luxury logo designs"""
        
        # Detect industry for better customization
        is_luxury = any(k in description for k in ["luxury", "premium", "exclusive", "haute", "couture", "fashion", "designer"])
        is_tech = any(k in description for k in ["tech", "software", "digital", "ai", "data", "crypto"])
        is_food = any(k in description for k in ["food", "cafe", "restaurant", "pizza", "burger", "cafe"])
        is_creative = any(k in description for k in ["creative", "design", "art", "studio", "media", "brand"])
        is_service = any(k in description for k in ["service", "consulting", "agency", "business", "company"])

        if variant % 6 == 0:
            # Premium Icon + Text - Elegant Circle
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="premium_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary};stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:{secondary};stop-opacity:1"/>
    </linearGradient>
    <filter id="premium_shadow" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-opacity="0.15"/>
    </filter>
    <filter id="inner_glow">
      <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
    </filter>
  </defs>
  
  <!-- Background circle -->
  <circle cx="{width//2}" cy="{int(height*0.45)}" r="{min(width,height)//2.5}" fill="url(#premium_grad1)" filter="url(#premium_shadow)" opacity="0.95"/>
  
  <!-- Inner highlight for glossy effect -->
  <circle cx="{int(width*0.35)}" cy="{int(height*0.3)}" r="{min(width,height)//8}" fill="{accent}" opacity="0.15" filter="url(#inner_glow)"/>
  
  <!-- Premium icon elements -->
  <g transform="translate({int(width*0.5)}, {int(height*0.35)})">
    <circle cx="0" cy="0" r="{int(min(width,height)*0.12)}" fill="none" stroke="{accent}" stroke-width="3" opacity="0.8"/>
    <path d="M -{int(min(width,height)*0.08)} 0 L {int(min(width,height)*0.08)} 0" stroke="{accent}" stroke-width="3" stroke-linecap="round"/>
    <path d="M 0 -{int(min(width,height)*0.08)} L 0 {int(min(width,height)*0.08)}" stroke="{accent}" stroke-width="3" stroke-linecap="round"/>
  </g>
  
  <!-- Brand name - Premium Typography -->
  <text x="{width//2}" y="{int(height*0.7)}" font-size="{int(height*0.18)}" font-weight="300" text-anchor="middle" fill="{primary}" font-family="Georgia, serif" letter-spacing="2">{brand_name[:16].upper()}</text>
  
  <!-- Subtle line decoration -->
  <line x1="{int(width*0.2)}" y1="{int(height*0.78)}" x2="{int(width*0.8)}" y2="{int(height*0.78)}" stroke="{accent}" stroke-width="2" opacity="0.6"/>
</svg>"""

        elif variant % 6 == 1:
            # Premium Geometric Icon - Modern Minimal
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="geo_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary}"/>
      <stop offset="100%" style="stop-color:{secondary}"/>
    </linearGradient>
    <filter id="premium_blur"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5"/></filter>
  </defs>
  
  <!-- Premium background -->
  <circle cx="{width//2}" cy="{height//2}" r="{min(width,height)//2.8}" fill="url(#geo_grad)" opacity="0.9"/>
  
  <!-- Geometric icon - Diamond with accent -->
  <g transform="translate({width//2}, {int(height*0.38)})">
    <path d="M 0 -{int(min(width,height)*0.15)} L {int(min(width,height)*0.15)} 0 L 0 {int(min(width,height)*0.15)} L -{int(min(width,height)*0.15)} 0 Z" fill="{accent}" opacity="0.85"/>
    <circle cx="0" cy="0" r="{int(min(width,height)*0.05)}" fill="white" opacity="0.3"/>
  </g>
  
  <!-- Premium text -->
  <text x="{width//2}" y="{int(height*0.75)}" font-size="{int(height*0.16)}" font-weight="400" text-anchor="middle" fill="white" font-family="Arial, sans-serif" letter-spacing="1.5">{brand_name[:18].upper()}</text>
</svg>"""

        elif variant % 6 == 2:
            # Premium Icon - Elegant Swoosh
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="radial_lux" cx="30%" cy="30%" r="70%">
      <stop offset="0%" style="stop-color:{accent};stop-opacity:0.3"/>
      <stop offset="100%" style="stop-color:{primary};stop-opacity:0.8"/>
    </radialGradient>
    <filter id="lux_shadow"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-opacity="0.2"/></filter>
  </defs>
  
  <circle cx="{width//2}" cy="{height//2}" r="{min(width,height)//2.7}" fill="url(#radial_lux)" filter="url(#lux_shadow)"/>
  
  <!-- Elegant swoosh icon -->
  <path d="M {int(width*0.25)} {int(height*0.5)} Q {width//2} {int(height*0.25)} {int(width*0.75)} {int(height*0.5)}" stroke="{accent}" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
  
  <!-- Accent points -->
  <circle cx="{int(width*0.25)}" cy="{int(height*0.5)}" r="4" fill="{accent}"/>
  <circle cx="{int(width*0.75)}" cy="{int(height*0.5)}" r="4" fill="{accent}"/>
  
  <!-- Premium brand text -->
  <text x="{width//2}" y="{int(height*0.72)}" font-size="{int(height*0.14)}" font-weight="300" text-anchor="middle" fill="{primary}" font-family="Verdana, sans-serif" letter-spacing="2">{brand_name[:20].upper()}</text>
</svg>"""

        elif variant % 6 == 3:
            # Premium Icon - Luxe Layered Design
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="layer_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary}"/>
      <stop offset="50%" style="stop-color:{secondary}"/>
      <stop offset="100%" style="stop-color:{accent}"/>
    </linearGradient>
  </defs>
  
  <circle cx="{width//2}" cy="{height//2}" r="{min(width,height)//2.6}" fill="url(#layer_grad)" opacity="0.9"/>
  
  <!-- Concentric circles for luxury effect -->
  <circle cx="{width//2}" cy="{height//2}" r="{int(min(width,height)*0.24)}" fill="none" stroke="{accent}" stroke-width="2" opacity="0.4"/>
  <circle cx="{width//2}" cy="{height//2}" r="{int(min(width,height)*0.18)}" fill="none" stroke="{accent}" stroke-width="2" opacity="0.5"/>
  <circle cx="{width//2}" cy="{height//2}" r="{int(min(width,height)*0.12)}" fill="{accent}" opacity="0.2"/>
  
  <!-- Center icon -->
  <g transform="translate({width//2}, {height//2})">
    <rect x="{int(-min(width,height)*0.06)}" y="{int(-min(width,height)*0.06)}" width="{int(min(width,height)*0.12)}" height="{int(min(width,height)*0.12)}" fill="{accent}" rx="2" opacity="0.9"/>
  </g>
  
  <!-- Premium text -->
  <text x="{width//2}" y="{int(height*0.8)}" font-size="{int(height*0.15)}" font-weight="500" text-anchor="middle" fill="white" font-family="Times New Roman, serif" letter-spacing="1">{brand_name[:17].upper()}</text>
</svg>"""

        elif variant % 6 == 4:
            # Premium Icon - Split Design
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="split_grad1" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:{primary}"/>
      <stop offset="100%" style="stop-color:{secondary}"/>
    </linearGradient>
  </defs>
  
  <circle cx="{width//2}" cy="{height//2}" r="{min(width,height)//2.7}" fill="url(#split_grad1)"/>
  
  <!-- Premium icon design -->
  <g transform="translate({width//2}, {int(height*0.38)})">
    <circle cx="{int(-min(width,height)*0.08)}" cy="0" r="{int(min(width,height)*0.1)}" fill="{accent}" opacity="0.8"/>
    <circle cx="{int(min(width,height)*0.08)}" cy="0" r="{int(min(width,height)*0.1)}" fill="white" opacity="0.15"/>
  </g>
  
  <!-- Luxury divider -->
  <line x1="{int(width*0.25)}" y1="{int(height*0.6)}" x2="{int(width*0.75)}" y2="{int(height*0.6)}" stroke="{accent}" stroke-width="2" opacity="0.6"/>
  
  <!-- Brand text - split -->
  <text x="{width//2}" y="{int(height*0.77)}" font-size="{int(height*0.16)}" font-weight="300" text-anchor="middle" fill="{accent}" font-family="Georgia, serif">{brand_name[:19].upper()}</text>
</svg>"""

        else:
            # Premium Icon - Abstract Premium
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="abstract_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary};stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:{secondary};stop-opacity:0.95"/>
    </linearGradient>
    <filter id="premium_glow"><feGaussianBlur stdDeviation="3"/></filter>
  </defs>
  
  <circle cx="{width//2}" cy="{height//2}" r="{min(width,height)//2.8}" fill="url(#abstract_grad)"/>
  
  <!-- Abstract premium icon -->
  <polygon points="{width//2},{int(height*0.25)} {int(width*0.7)},{int(height*0.55)} {int(width*0.3)},{int(height*0.55)}" fill="{accent}" opacity="0.85"/>
  <circle cx="{width//2}" cy="{int(height*0.5)}" r="{int(min(width,height)*0.08)}" fill="white" opacity="0.15"/>
  
  <!-- Premium branding -->
  <text x="{width//2}" y="{int(height*0.75)}" font-size="{int(height*0.17)}" font-weight="400" text-anchor="middle" fill="white" font-family="Arial, sans-serif" letter-spacing="1">{brand_name[:15].upper()}</text>
</svg>"""

    @staticmethod
    def _generate_premium_poster(brand_name, description, primary, secondary, accent, width, height, variant):
        """Generate PREMIUM luxury poster designs"""
        
        if variant % 6 == 0:
            # Premium Poster - Bold Statement
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="poster_grad1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary}"/>
      <stop offset="100%" style="stop-color:{secondary}"/>
    </linearGradient>
    <filter id="text_shadow"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-opacity="0.2"/></filter>
  </defs>
  
  <rect width="{width}" height="{height}" fill="url(#poster_grad1)"/>
  
  <!-- Geometric accent -->
  <circle cx="{int(width*0.15)}" cy="{int(height*0.15)}" r="{int(min(width,height)*0.12)}" fill="{accent}" opacity="0.15"/>
  <circle cx="{int(width*0.85)}" cy="{int(height*0.85)}" r="{int(min(width,height)*0.1)}" fill="{accent}" opacity="0.12"/>
  
  <!-- Central design box -->
  <rect x="{int(width*0.08)}" y="{int(height*0.2)}" width="{int(width*0.84)}" height="{int(height*0.6)}" fill="{accent}" opacity="0.08" rx="15"/>
  
  <!-- Premium heading -->
  <text x="{width//2}" y="{int(height*0.35)}" font-size="{int(height*0.15)}" font-weight="bold" text-anchor="middle" fill="{accent}" font-family="Georgia, serif" letter-spacing="3" filter="url(#text_shadow)">{brand_name[:25].upper()}</text>
  
  <!-- Decorative line -->
  <line x1="{int(width*0.15)}" y1="{int(height*0.5)}" x2="{int(width*0.85)}" y2="{int(height*0.5)}" stroke="{accent}" stroke-width="3" opacity="0.7"/>
  
  <!-- Subtext -->
  <text x="{width//2}" y="{int(height*0.68)}" font-size="{int(height*0.08)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="300">{description[:60].title()}</text>
</svg>"""

        elif variant % 6 == 1:
            # Premium Poster - Split Composition
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="{width//2}" height="{height}" fill="{primary}" opacity="0.9"/>
  <rect x="{width//2}" y="0" width="{width//2}" height="{height}" fill="{secondary}" opacity="0.9"/>
  
  <!-- Accent circles -->
  <circle cx="{int(width*0.25)}" cy="{int(height*0.25)}" r="{int(min(width,height)*0.15)}" fill="{accent}" opacity="0.2"/>
  <circle cx="{int(width*0.75)}" cy="{int(height*0.75)}" r="{int(min(width,height)*0.12)}" fill="{accent}" opacity="0.15"/>
  
  <!-- Premium content -->
  <text x="{width//2}" y="{int(height*0.4)}" font-size="{int(height*0.18)}" font-weight="bold" text-anchor="middle" fill="{accent}" font-family="Georgia, serif" letter-spacing="2">{brand_name[:22].upper()}</text>
  
  <!-- Decorative bars -->
  <rect x="{int(width*0.2)}" y="{int(height*0.58)}" width="{int(width*0.6)}" height="4" fill="{accent}" opacity="0.8" rx="2"/>
  
  <!-- Description -->
  <text x="{width//2}" y="{int(height*0.72)}" font-size="{int(height*0.07)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif">{description[:65].upper()}</text>
</svg>"""

        elif variant % 6 == 2:
            # Premium Poster - Centered Luxury
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="poster_radial" cx="50%" cy="40%" r="60%">
      <stop offset="0%" style="stop-color:{accent};stop-opacity:0.2"/>
      <stop offset="100%" style="stop-color:{primary};stop-opacity:0.8"/>
    </radialGradient>
  </defs>
  
  <rect width="{width}" height="{height}" fill="{secondary}"/>
  <ellipse cx="{width//2}" cy="{int(height*0.4)}" rx="{int(width*0.5)}" ry="{int(height*0.35)}" fill="url(#poster_radial)"/>
  
  <!-- Premium border -->
  <rect x="{int(width*0.05)}" y="{int(height*0.05)}" width="{int(width*0.9)}" height="{int(height*0.9)}" fill="none" stroke="{accent}" stroke-width="3" rx="10" opacity="0.6"/>
  
  <!-- Brand headline -->
  <text x="{width//2}" y="{int(height*0.35)}" font-size="{int(height*0.16)}" font-weight="bold" text-anchor="middle" fill="{accent}" font-family="Georgia, serif" letter-spacing="2">{brand_name[:24].upper()}</text>
  
  <!-- Central divider -->
  <line x1="{int(width*0.2)}" y1="{int(height*0.5)}" x2="{int(width*0.8)}" y2="{int(height*0.5)}" stroke="{accent}" stroke-width="2" opacity="0.7"/>
  
  <!-- Tagline -->
  <text x="{width//2}" y="{int(height*0.7)}" font-size="{int(height*0.08)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif">{description[:55].title()}</text>
</svg>"""

        elif variant % 6 == 3:
            # Premium Poster - Dynamic Layout
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="dynamic_grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary}"/>
      <stop offset="50%" style="stop-color:{secondary}"/>
      <stop offset="100%" style="stop-color:{accent}"/>
    </linearGradient>
  </defs>
  
  <rect width="{width}" height="{height}" fill="url(#dynamic_grad)"/>
  
  <!-- Geometric accent shapes -->
  <polygon points="0,0 {int(width*0.3)},0 0,{int(height*0.4)}" fill="{accent}" opacity="0.1"/>
  <polygon points="{width},{height} {int(width*0.7)},{height} {width},{int(height*0.6)}" fill="{accent}" opacity="0.15"/>
  
  <!-- Premium headline -->
  <text x="{width//2}" y="{int(height*0.32)}" font-size="{int(height*0.17)}" font-weight="bold" text-anchor="middle" fill="white" font-family="Georgia, serif" letter-spacing="2">{brand_name[:23].upper()}</text>
  
  <!-- Accent line -->
  <line x1="{int(width*0.15)}" y1="{int(height*0.48)}" x2="{int(width*0.85)}" y2="{int(height*0.48)}" stroke="white" stroke-width="3" opacity="0.8"/>
  
  <!-- Description -->
  <text x="{width//2}" y="{int(height*0.65)}" font-size="{int(height*0.09)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="300">{description[:58].upper()}</text>
</svg>"""

        elif variant % 6 == 4:
            # Premium Poster - Layered Geometric
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{width}" height="{height}" fill="{secondary}" opacity="0.95"/>
  
  <!-- Layered geometric background -->
  <rect x="0" y="0" width="{int(width*0.5)}" height="{height}" fill="{primary}" opacity="0.8"/>
  <polygon points="0,0 {int(width*0.4)},0 {width},{int(height*0.3)} {width},0" fill="{accent}" opacity="0.15"/>
  
  <!-- Central content area -->
  <rect x="{int(width*0.1)}" y="{int(height*0.15)}" width="{int(width*0.8)}" height="{int(height*0.7)}" fill="none" stroke="{accent}" stroke-width="2" rx="12" opacity="0.7"/>
  
  <!-- Main heading -->
  <text x="{width//2}" y="{int(height*0.38)}" font-size="{int(height*0.15)}" font-weight="bold" text-anchor="middle" fill="{accent}" font-family="Georgia, serif" letter-spacing="1">{brand_name[:25].upper()}</text>
  
  <!-- Decorative elements -->
  <circle cx="{int(width*0.1)}" cy="{int(height*0.15)}" r="5" fill="{accent}" opacity="0.8"/>
  <circle cx="{int(width*0.9)}" cy="{int(height*0.85)}" r="5" fill="{accent}" opacity="0.8"/>
  
  <!-- Text content -->
  <text x="{width//2}" y="{int(height*0.68)}" font-size="{int(height*0.07)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif">{description[:60].title()}</text>
</svg>"""

        else:
            # Premium Poster - Minimal Luxury
            return f"""<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="minimal_lux" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:{primary};stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:{secondary};stop-opacity:0.95"/>
    </linearGradient>
  </defs>
  
  <rect width="{width}" height="{height}" fill="url(#minimal_lux)"/>
  
  <!-- Minimalist accent -->
  <line x1="{int(width*0.2)}" y1="{int(height*0.15)}" x2="{int(width*0.8)}" y2="{int(height*0.15)}" stroke="{accent}" stroke-width="3" opacity="0.7"/>
  
  <!-- Premium brand name -->
  <text x="{width//2}" y="{int(height*0.4)}" font-size="{int(height*0.18)}" font-weight="300" text-anchor="middle" fill="{accent}" font-family="Georgia, serif" letter-spacing="3">{brand_name[:20].upper()}</text>
  
  <!-- Divider -->
  <line x1="{int(width*0.2)}" y1="{int(height*0.58)}" x2="{int(width*0.8)}" y2="{int(height*0.58)}" stroke="{accent}" stroke-width="2" opacity="0.6"/>
  
  <!-- Description text -->
  <text x="{width//2}" y="{int(height*0.75)}" font-size="{int(height*0.08)}" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-weight="light">{description[:62].upper()}</text>
</svg>"""

    # -----------------------------------------------------------
    # Generate Design
    # -----------------------------------------------------------

    @staticmethod
    def generate_design(data: dict) -> dict:
        """
        Generate unique logo/poster SVG using Gemini AI with intelligent fallback
        """

        # Configure APIs
        DesignService.configure_clients()

        prompt = DesignService.build_svg_prompt(data)

        svg = None
        is_fallback = False
        used_api = False

        try:
            # Try Gemini AI first - attempt to get actual generated design
            print(f"🎨 Attempting Gemini AI generation for {data.get('type', 'design')}...")
            model = genai.GenerativeModel("gemini-1.5-flash")
            response = model.generate_content(prompt, generation_config={"temperature": 1.0})
            
            svg_response = response.text
            svg = DesignService.extract_svg(svg_response)

            if svg and svg.lower().startswith("<svg"):
                print(f"✅ AI successfully generated SVG design")
                used_api = True
            else:
                print(f"⚠️ AI response didn't contain valid SVG, trying extraction...")
                # Try harder to extract
                if "<svg" in svg_response.lower():
                    svg = DesignService.extract_svg(svg_response)

        except Exception as e:
            error_str = str(e).lower()
            print(f"❌ API Error: {str(e)[:100]}")
            
            # Check if it's a quota error
            if any(keyword in error_str for keyword in ["quota", "rate.?limit", "429", "resource.?exhausted", "exceeded"]):
                print(f"⚠️  Gemini API quota exceeded. Using advanced fallback.")
                svg = DesignService.generate_advanced_fallback(data)
                is_fallback = True
            else:
                print(f"⚠️  API unavailable. Using advanced fallback generator.")
                svg = DesignService.generate_advanced_fallback(data)
                is_fallback = True

        if not svg or not svg.lower().startswith("<svg"):
            print(f"⚠️  SVG generation failed. Using premium fallback.")
            svg = DesignService.generate_advanced_fallback(data)
            is_fallback = True

        # -------------------------------------------------------
        # Save SVG Locally
        # -------------------------------------------------------

        os.makedirs(UPLOAD_FOLDER, exist_ok=True)

        base_name = f"{data.get('type','design')}_{data.get('brandName','smartads')}_{datetime.utcnow().strftime('%Y%m%d%H%M%S%f')}"

        file_name = secure_filename(base_name) + ".svg"

        file_path = os.path.join(UPLOAD_FOLDER, file_name)

        with open(file_path, "w", encoding="utf-8") as f:
            f.write(svg)

        print(f"💾 SVG saved to {file_name}")

        # -------------------------------------------------------
        # Upload to Cloudinary
        # -------------------------------------------------------

        try:
            upload_result = cloudinary.uploader.upload(
                file_path,
                folder="smartads/generated",
                resource_type="image",
                use_filename=True,
                unique_filename=True,
                overwrite=False,
            )

        except Exception as e:
            raise RuntimeError(f"Cloudinary upload failed: {str(e)}")

        cloud_url = upload_result.get("secure_url")
        public_id = upload_result.get("public_id")

        print(f"☁️  Uploaded to Cloudinary: {cloud_url[:80]}...")

        # -------------------------------------------------------
        # Save Metadata to Database
        # -------------------------------------------------------

        doc = {
            "type": data.get("type"),
            "brandName": data.get("brandName"),
            "tagline": data.get("tagline"),
            "colors": data.get("colors"),
            "style": data.get("style"),
            "description": data.get("description"),
            "size": data.get("size"),
            "prompt": prompt,
            "cloudinaryUrl": cloud_url,
            "publicId": public_id,
            "fileName": file_name,
            "createdAt": datetime.utcnow(),
            "isFallback": is_fallback,
            "usedAPI": used_api,
        }

        result = db["LogoPoster"].insert_one(doc)

        return {
            "id": str(result.inserted_id),
            "url": cloud_url,
            "publicId": public_id,
            "fileName": file_name,
            "isFallback": is_fallback,
            "usedAPI": used_api,
            "message": "AI-generated design" if used_api else "Generated using fallback engine",
        }

    # -----------------------------------------------------------
    # Fetch Recent Designs
    # -----------------------------------------------------------

    @staticmethod
    def get_designs(limit: int = 50) -> list:
        """Return latest generated designs"""

        items = []

        for doc in db["LogoPoster"].find().sort("createdAt", -1).limit(limit):
            doc["_id"] = str(doc["_id"])
            items.append(doc)

        return items