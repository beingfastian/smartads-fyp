import requests
import json

# Test 1: Logo generation
print("="*60)
print("TEST 1: Logo Generation (Tech keyword)")
print("="*60)
logo_data = {
    'type': 'logo',
    'brandName': 'TechVision',
    'description': 'ai software trading platform',
    'colors': ['#0ea5e9', '#1e40af', '#f59e0b'],
    'size': '1024x1024'
}

try:
    response = requests.post('http://localhost:5000/api/generate-design', json=logo_data)
    print(f'Status: {response.status_code}')
    result = response.json()
    print(f'Full Response: {json.dumps(result, indent=2)}')
    print(f'Used API: {result.get("usedAPI", False)}')
    print(f'Message: {result.get("message", "")}')
    img_url = result.get('url', result.get('image', ''))
    print(f'Image URL: {img_url}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()

print("\n")

# Test 2: Poster generation
print("="*60)
print("TEST 2: Poster Generation (Food keyword)")
print("="*60)
poster_data = {
    'type': 'poster',
    'brandName': 'FoodFresh',
    'description': 'restaurant pizza cafe organic food delivery',
    'colors': ['#e74c3c', '#f39c12', '#2ecc71'],
    'size': '1024x768'
}

try:
    response = requests.post('http://localhost:5000/api/generate-design', json=poster_data)
    print(f'Status: {response.status_code}')
    result = response.json()
    print(f'Full Response: {json.dumps(result, indent=2)}')
    print(f'Used API: {result.get("usedAPI", False)}')
    print(f'Message: {result.get("message", "")}')
    img_url = result.get('url', result.get('image', ''))
    print(f'Image URL: {img_url}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()

print("\n")

# Test 3: Another logo test (verify uniqueness)
print("="*60)
print("TEST 3: Logo Generation #2 (Creative keyword)")
print("="*60)
logo_data2 = {
    'type': 'logo',
    'brandName': 'CreativeHub',
    'description': 'creative design studio art brand',
    'colors': ['#9b59b6', '#3498db', '#e74c3c'],
    'size': '1024x1024'
}

try:
    response = requests.post('http://localhost:5000/api/generate-design', json=logo_data2)
    print(f'Status: {response.status_code}')
    result = response.json()
    print(f'Full Response: {json.dumps(result, indent=2)}')
    print(f'Used API: {result.get("usedAPI", False)}')
    print(f'Message: {result.get("message", "")}')
    img_url = result.get('url', result.get('image', ''))
    print(f'Image URL: {img_url}')
except Exception as e:
    print(f'Error: {e}')
    import traceback
    traceback.print_exc()
