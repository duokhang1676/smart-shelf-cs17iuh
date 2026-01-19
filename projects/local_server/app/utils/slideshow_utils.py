'''
* Copyright 2025 Tran Vu Thuy Trang [C]
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
'''
"""
Slideshow images utility functions - Hybrid version (slideshow_images.json + valid combos)
"""
import json
import os
from datetime import datetime

def load_slideshow_images():
    """Load slideshow images from JSON file"""
    try:
        # Get absolute path to database directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(project_root, 'database', 'slideshow_images.json')
        
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading slideshow images: {e}")
        return []

def load_valid_combos():
    """Load valid combos (not expired, active) from combo.json"""
    try:
        # Get absolute path to database directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(project_root, 'database', 'combo.json')
        
        with open(file_path, 'r', encoding='utf-8') as f:
            combos = json.load(f)
        
        # Filter valid combos (not expired)
        valid_combos = []
        current_time = datetime.now()
        
        for combo in combos:
            # Check if combo has validTo field and not expired
            if 'validTo' in combo:
                try:
                    valid_to = datetime.fromisoformat(combo['validTo'].replace('Z', '+00:00'))
                    if valid_to.replace(tzinfo=None) > current_time:
                        valid_combos.append(combo)
                except Exception as e:
                    print(f"Error parsing date for combo {combo.get('id', 'unknown')}: {e}")
            else:
                # If no validTo field, consider it valid
                valid_combos.append(combo)
        
        return valid_combos
    except Exception as e:
        print(f"Error loading combos: {e}")
        return []

def get_slideshow_images():
    """Get all slideshow images (from slideshow_images.json + valid combos)"""
    # Load slideshow images
    slideshow_images = load_slideshow_images()
    
    # Load valid combo images
    valid_combos = load_valid_combos()
    
    # Convert to format expected by frontend
    images = []
    seen_urls = set()
    
    # Add images from slideshow_images.json first
    for image in slideshow_images:
        image_url = image.get('image_url')
        
        if image_url and image_url not in seen_urls:
            images.append({
                'url': image_url,
                'alt': 'Slideshow Image',
                'source': 'slideshow_images.json'
            })
            seen_urls.add(image_url)
    
    # Add images from valid combos (avoid duplicates)
    for combo in valid_combos:
        combo_img = combo.get('img')
        
        if combo_img and combo_img not in seen_urls:
            images.append({
                'url': combo_img,
                'alt': combo.get('name', 'Combo Image'),
                'source': f'combo.json (ID: {combo.get("id", "unknown")})'
            })
            seen_urls.add(combo_img)
    
    return images

def add_slideshow_image(image_url):
    """Add new slideshow image (supports both local and cloud URLs)"""
    try:
        # Get absolute path to database directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(project_root, 'database', 'slideshow_images.json')
        
        # Load current data
        with open(file_path, 'r', encoding='utf-8') as f:
            images = json.load(f)
        
        # Normalize URL for comparison (remove protocol for cloud URLs)
        normalized_url = image_url
        if image_url.startswith('https://') or image_url.startswith('http://'):
            normalized_url = image_url.replace('https://', '').replace('http://', '')
        
        # Check if image_url already exists (compare both original and normalized)
        for image in images:
            existing_url = image.get('image_url', '')
            existing_normalized = existing_url
            if existing_url.startswith('https://') or existing_url.startswith('http://'):
                existing_normalized = existing_url.replace('https://', '').replace('http://', '')
            
            if existing_url == image_url or existing_normalized == normalized_url:
                print(f"Slideshow image with URL {image_url} already exists")
                return False
        
        # Add new image (minimal structure - only image_url)
        new_image = {
            'image_url': image_url
        }
        
        images.append(new_image)
        
        # Save updated data
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(images, f, indent=2, ensure_ascii=False)
        
        return True
    except Exception as e:
        print(f"Error adding slideshow image: {e}")
        return False

def remove_slideshow_image_by_url(image_url):
    """Remove slideshow image by image_url"""
    try:
        # Get absolute path to database directory
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(current_dir))
        file_path = os.path.join(project_root, 'database', 'slideshow_images.json')
        
        # Load current data
        with open(file_path, 'r', encoding='utf-8') as f:
            images = json.load(f)
        
        # Find and remove image
        original_length = len(images)
        images = [img for img in images if img.get('image_url') != image_url]
        
        if len(images) < original_length:
            # Save updated data
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(images, f, indent=2, ensure_ascii=False)
            
            print(f"Removed slideshow image: {image_url}")
            return True
        else:
            print(f"No slideshow image found with URL: {image_url}")
            return False
            
    except Exception as e:
        print(f"Error removing slideshow image: {e}")
        return False
