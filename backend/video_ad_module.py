import os
import tempfile
import requests
from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from pymongo import MongoClient
import cloudinary
import cloudinary.uploader

# moviepy import: use specific submodule path to avoid editor import issues
from moviepy.video.io.ImageSequenceClip import ImageSequenceClip

video_ad_module = Blueprint('video_ad_module', __name__)
CORS(video_ad_module, origins=["*"])

# Load environment and configuration
load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
CUSTOM_GEMINI_MODEL = os.getenv("GEMINI_MODEL")
CLOUDINARY_CLOUD_NAME = os.getenv("CLOUD_NAME")
CLOUDINARY_API_KEY = os.getenv("CLOUD_API_KEY")
CLOUDINARY_API_SECRET = os.getenv("CLOUD_API_SECRET")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")

if not GEMINI_API_KEY:
    print("[ERROR] GEMINI_API_KEY is missing from environment. Image generation will fail.")

cloudinary.config(
    cloud_name=CLOUDINARY_CLOUD_NAME,
    api_key=CLOUDINARY_API_KEY,
    api_secret=CLOUDINARY_API_SECRET,
)

client = MongoClient(MONGO_URI)
db = client.get_database(os.getenv("DATABASE_NAME", "SmartAds"))
videos_collection = db.get_collection("videos")

# ==========================================================
# NEW ROUTE: ENHANCE PROMPT & SAFETY FILTER
# ==========================================================
@video_ad_module.route("/enhance-prompt", methods=["POST"])
def enhance_prompt():
    data = request.get_json() or {}
    
    # Safety and Professional Enhancement Instruction
    system_instruction = (
        "Role: Expert Ad Creative Director and Content Safety Moderator. "
        "Task 1: Scan the input for any vulgar, inappropriate, or low-quality language. "
        "Task 2: If found, replace them with high-end, professional marketing terminology. "
        "Task 3: Convert the raw product details (even if in Roman Urdu/Hindi) into ONE "
        "sophisticated English image generation prompt focused on 8k resolution and cinematic lighting. "
        "Style: Professional One-Shot Prompting.\n\n"
        "Example Input: Product: sasti gandi coffee, Features: garam.\n"
        "Enhanced Prompt: A premium steaming hot artisan coffee in a dark ceramic cup, "
        "placed on a rustic wooden table with soft cinematic morning sunlight, 8k resolution, highly detailed.\n\n"
        "Now, enhance these details: "
    )

    raw_details = (
        f"Product Name: {data.get('productName')}, Description: {data.get('productDescription')}, "
        f"Category: {data.get('productCategory')}, Features: {data.get('keyFeatures')}."
    )

    final_payload = {
        "contents": [{
            "parts": [{
                "text": f"{system_instruction}\nInput: {raw_details}\n\nResulting Professional Prompt:"
            }]
        }]
    }

    chosen_model = CUSTOM_GEMINI_MODEL or "gemini-1.5-flash"
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:generateContent?key={GEMINI_API_KEY}"

    try:
        resp = requests.post(gemini_url, json=final_payload, timeout=30)
        res_json = resp.json()
        enhanced_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
        return jsonify({"enhancedPrompt": enhanced_text}), 200
    except Exception as e:
        return jsonify({"error": f"Enhancement failed: {str(e)}"}), 500


@video_ad_module.route("/generate-images", methods=["POST"])
def generate_images():
    data = request.get_json() or {}
    # Use the enhanced prompt passed from frontend
    professional_prompt = data.get("enhancedPrompt")

    if not GEMINI_API_KEY:
        return jsonify({"error": "GEMINI_API_KEY is missing."}), 500
    
    if not professional_prompt:
        return jsonify({"error": "No professional prompt provided."}), 400

    # --- NEGATIVE CONSTRAINTS LOGIC ---
    negative_constraints = (
        "Negative Constraints: Ensure NO blurry textures, NO distorted text, NO messy backgrounds, "
        "NO watermarks, NO low resolution, NO anatomical glitches, NO overlapping elements, NO vulgarity."
    )

    payload = {
        "contents": [{
            "parts": [{
                "text": f"Generate 5 high-quality commercial image variations for this prompt: {professional_prompt}. {negative_constraints}"
            }]
        }]
    }

    chosen_model = CUSTOM_GEMINI_MODEL or "gemini-1.5-flash"
    gemini_url = f"https://generativelanguage.googleapis.com/v1beta/models/{chosen_model}:generateContent?key={GEMINI_API_KEY}"

    try:
        resp = requests.post(gemini_url, json=payload, timeout=45)
        if resp.status_code != 200:
            return jsonify({"error": "Gemini API error", "details": resp.text}), 500
        
        gemini_data = resp.json()
        images = []

        contents = gemini_data.get("contents") or gemini_data.get("output") or []
        for block in contents:
            parts = block.get("parts") or []
            for part in parts:
                inline = part.get("inlineData") or {}
                if inline and "data" in inline:
                    b64 = inline.get("data")
                    upload_result = cloudinary.uploader.upload(f"data:image/png;base64,{b64}", folder="video_ads")
                    images.append(upload_result.get("secure_url"))
                if part.get("type") == "image" and part.get("url"):
                    images.append(part.get("url"))

        if not images:
            return jsonify({"error": "No images generated", "gemini_response": gemini_data}), 500

        # Save metadata to DB
        video_doc = {
            "prompt": professional_prompt,
            "images": images,
            "created_at": datetime.utcnow().isoformat(),
        }
        videos_collection.insert_one(video_doc)

        return jsonify({"images": images}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@video_ad_module.route("/generate-video", methods=["POST"])
def generate_video():
    data = request.get_json() or {}
    image_urls = data.get("image_urls", [])
    product_id = data.get("product_id")

    if not image_urls:
        return jsonify({"error": "No image_urls provided"}), 400

    image_files = []
    try:
        for url in image_urls:
            resp = requests.get(url, timeout=15)
            if resp.status_code == 200:
                tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.jpg')
                tmp.write(resp.content)
                tmp.close()
                image_files.append(tmp.name)
            else:
                return jsonify({"error": f"Failed to download image: {url}"}), 400

        clip = ImageSequenceClip(image_files, fps=1)
        video_tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp4')
        video_tmp.close()
        video_path = video_tmp.name
        clip.write_videofile(video_path, codec='libx264', audio=False, verbose=False, logger=None)

        upload_result = cloudinary.uploader.upload(video_path, resource_type="video", folder="video_ads")
        video_url = upload_result.get("secure_url")

        video_doc = {
            "images": image_urls,
            "video_url": video_url,
            "created_at": datetime.utcnow().isoformat(),
        }
        if product_id:
            video_doc["product_id"] = product_id
        videos_collection.insert_one(video_doc)

        return jsonify({"video_url": video_url}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        for f in image_files:
            try:
                os.remove(f)
            except:
                pass
        try:
            if 'video_path' in locals() and os.path.exists(video_path):
                os.remove(video_path)
        except:
            pass