import sys
from google import genai
from google.genai import types

client = genai.Client(api_key='AIzaSyCaYOTl4CbuCZ8_UHj146Zc48qk28aX9J8')

try:
    print("Testing imagen-4.0-generate-001...")
    res = client.models.generate_images(
        model='imagen-4.0-generate-001',
        prompt='A minimalistic digital logo for a smart ads tool, highly detailed, professional.',
        config=types.GenerateImagesConfig(
            number_of_images=1,
            output_mime_type="image/jpeg",
            aspect_ratio="1:1"
        )
    )
    print("Success. response format:", type(res))
    print("Attributes inside response:", dir(res))
    if hasattr(res, "generated_images") and len(res.generated_images) > 0:
        img = res.generated_images[0]
        print("Got generated image, type:", type(img), dir(img))
        with open("test_imagen4.jpg", "wb") as f:
            f.write(img.image.image_bytes)
        print("Saved to test_imagen4.jpg")
except Exception as e:
    print("Error:", str(e))
