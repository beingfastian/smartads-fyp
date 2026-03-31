"""
Application configuration settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

# MongoDB Configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb+srv://abdullahamin2k22_db_user:s5Sf2hcSknl6Vhgg@cluster0.wdjexxf.mongodb.net/SmartAds?retryWrites=true&w=majority&tls=true&appName=Cluster0")
DATABASE_NAME = os.getenv("DATABASE_NAME", "SmartAds")

# Flask Configuration
FLASK_HOST = os.getenv("FLASK_HOST", "127.0.0.1")
FLASK_PORT = int(os.getenv("FLASK_PORT", "5000"))
FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"

# Cloudinary Configuration
CLOUD_NAME = os.getenv("CLOUD_NAME")
CLOUD_API_KEY = os.getenv("CLOUD_API_KEY")
CLOUD_API_SECRET = os.getenv("CLOUD_API_SECRET")

# Gemini AI Configuration
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Upload Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
