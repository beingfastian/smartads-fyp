import os
import traceback
from google import genai

try:
    client = genai.Client(api_key='AIzaSyAS8BBv2yWFjmK9uNLOY7P-6n1ZHyhWIYE')
    models = client.models.list()
    for m in models:
        print(f"Model: {m.name}")
except Exception as e:
    print("Error:", traceback.format_exc())
