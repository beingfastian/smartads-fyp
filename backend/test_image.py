import sys
from google import genai
from google.genai import types

client = genai.Client(api_key='AIzaSyAS8BBv2yWFjmK9uNLOY7P-6n1ZHyhWIYE')

try:
    print("Testing gemini-2.5-flash-image with generate_content...")
    res = client.models.generate_content(
        model='gemini-2.5-flash-image',
        contents='A cool minimal logo for a smart advertising tool'
    )
    
    part = res.candidates[0].content.parts[0]
    if hasattr(part, 'inline_data') and part.inline_data:
        print("Success! Got inline_data image data.")
        with open('test_logo.jpg', 'wb') as f:
            f.write(part.inline_data.data)
        print("Successfully saved mock image!")
    else:
        print("Unexpected response structure:", part)
except Exception as e:
    print("Error:", str(e))
