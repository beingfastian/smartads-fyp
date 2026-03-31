import requests

# Test what's actually being generated
payload = {
    'type': 'logo',
    'brandName': 'shoe',
    'description': 'luxury premium footwear quality shoes',
    'colors': ['#0066FF', '#00D9FF', '#1A1A2E'],
    'size': '1024x1024'
}

response = requests.post('http://localhost:5000/api/generate-design', json=payload)
result = response.json()

print("Logo Generated:")
print(f"URL: {result.get('url')}")
print(f"Is Fallback: {result.get('isFallback')}")
print(f"Used API: {result.get('usedAPI')}")
print(f"Message: {result.get('message')}")

# Download and save the SVG to inspect it
import urllib.request
svg_content = requests.get(result.get('url')).text
with open('generated_logo.svg', 'w') as f:
    f.write(svg_content)

print("\n" + "="*60)
print("SVG CODE (first 2000 chars):")
print("="*60)
print(svg_content[:2000])
