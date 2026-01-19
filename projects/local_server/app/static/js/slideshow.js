/*
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
*/
/**
 * Slideshow JavaScript
 * Handles slideshow functionality, voice commands, and WebSocket communication
 */

// Use existing socket or create new one
let socket = null;

function initializeSocket() {
    if (window.NavigationUtils && window.navigation && window.navigation.socket) {
        socket = window.navigation.socket;
        console.log('Slideshow: Using existing navigation socket');
        setupSocketHandlers();
    } else if (typeof io !== 'undefined') {
        socket = io();
        console.log('Slideshow: Created new socket connection');
        setupSocketHandlers();
    } else {
        // Retry after a short delay if Socket.IO not loaded yet
        setTimeout(initializeSocket, 100);
    }
}

function setupSocketHandlers() {
    if (!socket) return;

    // Voice command event listeners
    socket.on('redirect_to_combo', function(data) {
        console.log('Voice command: redirect to combo page');
        if (data.message) {
            console.log(data.message);
        }
        window.location.href = data.url || '/combo';
    });

    socket.on('redirect_to_cart', function(data) {
        console.log('Voice command: redirect to cart page');
        if (data.message) {
            console.log(data.message);
        }
        window.location.href = data.url || '/cart';
    });

    socket.on('redirect_to_payment', function(data) {
        console.log('Voice command: redirect to payment page');
        if (data.message) {
            console.log(data.message);
        }
        window.location.href = '/qr';
    });

    // RFID event listener - handle employee adding max_quantity
    socket.on('employee_adding_max_quantity', function(data) {
        console.log('RFID detected: employee adding max_quantity, redirecting to shelf page');
        if (data.message) {
            console.log(data.message);
        }
        
        // Lock navigation briefly before redirect
        lockNavigation();
        
        window.location.href = data.url || '/shelf';
    });

    // Handle max_quantity added notification
    socket.on('max_quantity_added_notification', function(data) {
        console.log('Max quantity added notification:', data);
        
        // Unlock navigation when max_quantity added successfully
        unlockNavigation();
    });

    // WebSocket connection events
    socket.on('connect', function() {
        console.log('Connected to WebSocket on slideshow page');
        socket.emit('slideshow_page_enter');
    });

    socket.on('disconnect', function() {
        console.log('Disconnected from WebSocket on slideshow page');
    });

    // Clean up on page unload
    window.addEventListener('beforeunload', function() {
        if (socket) {
            socket.emit('slideshow_page_leave');
        }
    });

    // Loadcell monitoring
    socket.on('loadcell_update', function(data) {
        if (data.customer_activity && data.customer_activity.is_customer_present) {
            console.log('Customer detected via loadcell on slideshow page');
        }
        
        // Check for taken quantity changes and redirect to cart
        if (data.taken_quantity && Array.isArray(data.taken_quantity)) {
            const currentTakenQuantities = data.taken_quantity;
            
            // Check if any product has been taken (taken quantity > 0)
            const hasProductTaken = currentTakenQuantities.some(qty => qty > 0);
            console.log('Has product taken:', hasProductTaken, 'Current quantities:', currentTakenQuantities);
            
            if (hasProductTaken) {
                console.log('Product taken detected on slideshow, redirecting to cart page...');
                console.log('Executing redirect to cart page from slideshow');
                window.location.href = '/cart';
            }
        }
    });

    socket.on('create_order_and_redirect', function(data) {
        console.log('Create order and redirect event on slideshow:', data);
        if (data.message) {
            console.log(data.message);
        }
        window.location.href = data.url || '/cart';
    });

    // Voice command: redirect to cart page
    socket.on('redirect_to_cart', function(data) {
        console.log('Voice command: redirect to cart page from slideshow');
        window.location.href = data.url || '/cart';
    });

    // Voice command: redirect to main/slideshow page
    socket.on('redirect_to_main', function(data) {
        console.log('Voice command: redirect to main page from slideshow');
        window.location.href = data.url || '/';
    });
}

// Initialize socket when ready
initializeSocket();

// Slideshow variables
let slides = [];
let currentSlide = 0;
let slideInterval;
const slideDuration = 3000; // 3 seconds per slide
let progressInterval;
let failedImages = new Set(); // Track failed images to avoid retry

// Function to validate if image exists
async function validateImage(url) {
    return new Promise((resolve) => {
        // Skip if already known to be failed
        if (failedImages.has(url)) {
            resolve(false);
            return;
        }
        
        const img = new Image();
        
        // Set timeout for cloud images (longer timeout)
        const isCloudUrl = !url.startsWith('/static/') && !url.startsWith('/');
        const timeoutDuration = isCloudUrl ? 10000 : 5000; // 10s for cloud, 5s for local
        
        const timeout = setTimeout(() => {
            failedImages.add(url);
            console.warn(`Image validation timeout: ${url} - skipping this image`);
            resolve(false);
        }, timeoutDuration);
        
        img.onload = () => {
            clearTimeout(timeout);
            console.log(`Image validated successfully: ${url}`);
            resolve(true);
        };
        
        img.onerror = () => {
            clearTimeout(timeout);
            failedImages.add(url);
            console.warn(`Image validation failed: ${url} - skipping this image`);
            resolve(false);
        };
        
        // Handle cloud URLs - add protocol if missing
        if (isCloudUrl && !url.startsWith('http')) {
            img.src = 'https://' + url;
        } else {
            img.src = url;
        }
    });
}

// Initialize slideshow when DOM is loaded
async function initSlideshow() {
    try {
        const response = await fetch('/api/slideshow-images');
        const data = await response.json();
        
        console.log('Slideshow API response:', data); // Debug log
        
        if (data.success && data.images && data.images.length > 0) {
            // Log sources information
            if (data.sources) {
                console.log(`Slideshow Sources:
                - slideshow_images.json: ${data.sources.slideshow_images_json} images
                - valid combos: ${data.sources.valid_combos} combos  
                - total unique: ${data.sources.total_unique} images`);
            }
            
            // Validate all images before adding to slideshow
            const validSlides = [];
            
            for (const image of data.images) {
                const isValid = await validateImage(image.url);
                if (isValid) {
                    validSlides.push(image);
                    console.log(`Valid: ${image.url} (${image.source || 'unknown source'})`);
                } else {
                    console.log(`Invalid: ${image.url} (${image.source || 'unknown source'})`);
                }
            }
            
            console.log(`Validation Results: ${validSlides.length}/${data.images.length} images valid`);
            
            if (validSlides.length > 0) {
                slides = validSlides;
                
                createSlideshow();
                createNavigationDots();
                startSlideshow();
                hideLoading();
            } else {
                console.warn('No valid images found, using fallback');
                await useFallbackImages();
            }
        } else {
            console.error('No slideshow images found:', data.message);
            await useFallbackImages();
        }
    } catch (error) {
        console.error('Error loading slideshow:', error);
        await useFallbackImages();
    }
}

// Use fallback images and validate them too
async function useFallbackImages() {
    const fallbackImages = [
        { url: '/static/img/1.jpg', alt: 'Default Image 1' },
        { url: '/static/img/kda.png', alt: 'Default Image 2' }
    ];
    
    const validFallbacks = [];
    for (const image of fallbackImages) {
        const isValid = await validateImage(image.url);
        if (isValid) {
            validFallbacks.push(image);
        }
    }
    
    if (validFallbacks.length > 0) {
        slides = validFallbacks;
        createSlideshow();
        createNavigationDots();
        startSlideshow();
        hideLoading();
    } else {
        console.error('No valid images available, including fallbacks');
        showError('No images available for slideshow');
    }
}

function createSlideshow() {
    const container = document.getElementById('slideshow');
    container.innerHTML = '';
    
    slides.forEach((slide, index) => {
        const slideDiv = document.createElement('div');
        slideDiv.className = 'slide';
        if (index === 0) slideDiv.classList.add('active');
        
        const img = document.createElement('img');
        
        // Handle cloud URLs - add protocol if missing
        let imageUrl = slide.url;
        const isCloudUrl = !imageUrl.startsWith('/static/') && !imageUrl.startsWith('/');
        if (isCloudUrl && !imageUrl.startsWith('http')) {
            imageUrl = 'https://' + imageUrl;
        }
        
        img.src = imageUrl;
        img.alt = slide.alt || slide.title || `Slide ${index + 1}`;
        
        // Add loading and error handling for cloud images
        img.onload = function() {
            console.log(`Image loaded successfully: ${imageUrl}`);
        };
        
        // No retry logic needed since images are pre-validated
        img.onerror = function() {
            console.error(`Pre-validated image failed to load: ${imageUrl}`);
            // Hide this slide instead of retrying
            slideDiv.style.display = 'none';
        };
        
        // Add loading state for cloud images
        if (isCloudUrl) {
            img.style.opacity = '0';
            img.onload = function() {
                console.log(`Cloud image loaded successfully: ${imageUrl}`);
                img.style.opacity = '1';
                img.style.transition = 'opacity 0.3s ease';
            };
        }
        
        slideDiv.appendChild(img);
        container.appendChild(slideDiv);
    });
}

function createNavigationDots() {
    const navDots = document.getElementById('navDots');
    navDots.innerHTML = '';
    
    slides.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'nav-dot';
        if (index === 0) dot.classList.add('active');
        dot.addEventListener('click', () => goToSlide(index));
        navDots.appendChild(dot);
    });
}

function updateActiveDot() {
    document.querySelectorAll('.nav-dot').forEach(dot => {
        dot.classList.remove('active');
    });
    
    const dots = document.querySelectorAll('.nav-dot');
    if (dots[currentSlide]) {
        dots[currentSlide].classList.add('active');
    }
}

function goToSlide(index) {
    if (index >= 0 && index < slides.length) {
        // Remove active class from current slide
        document.querySelectorAll('.slide').forEach(slide => {
            slide.classList.remove('active');
        });
        
        // Add active class to new slide
        const slideElements = document.querySelectorAll('.slide');
        if (slideElements[index]) {
            slideElements[index].classList.add('active');
        }
        
        currentSlide = index;
        updateActiveDot();
        restartProgress();
    }
}

function nextSlide() {
    const nextIndex = (currentSlide + 1) % slides.length;
    goToSlide(nextIndex);
}

function prevSlide() {
    const prevIndex = (currentSlide - 1 + slides.length) % slides.length;
    goToSlide(prevIndex);
}

function startSlideshow() {
    // Clear any existing interval
    if (slideInterval) {
        clearInterval(slideInterval);
    }
    
    // Start auto-advance
    slideInterval = setInterval(nextSlide, slideDuration);
    
    // Start progress bar
    startProgress();
}

function startProgress() {
    const progressBar = document.getElementById('progressBar');
    let progress = 0;
    const increment = 100 / (slideDuration / 50); // Update every 50ms
    
    if (progressInterval) {
        clearInterval(progressInterval);
    }
    
    progressInterval = setInterval(() => {
        progress += increment;
        progressBar.style.width = progress + '%';
        
        if (progress >= 100) {
            progress = 0;
        }
    }, 50);
}

function restartProgress() {
    startProgress();
}

function hideLoading() {
    const loading = document.getElementById('loading');
    const slideshow = document.getElementById('slideshow');
    
    if (loading) loading.style.display = 'none';
    if (slideshow) slideshow.style.display = 'block';
}

function showError(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.innerHTML = `<div class="error">${message}</div>`;
    }
}

// Keyboard navigation
document.addEventListener('keydown', function(event) {
    switch(event.key) {
        case 'ArrowLeft':
            prevSlide();
            break;
        case 'ArrowRight':
            nextSlide();
            break;
        case ' ': // Spacebar
            event.preventDefault();
            nextSlide();
            break;
        case 'Escape':
            // Go to shelf page
            window.location.href = '/shelf';
            break;
    }
});

// Touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(event) {
    touchStartX = event.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(event) {
    touchEndX = event.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const diff = touchStartX - touchEndX;
    
    if (Math.abs(diff) > swipeThreshold) {
        if (diff > 0) {
            // Swipe left - next slide
            nextSlide();
        } else {
            // Swipe right - previous slide
            prevSlide();
        }
    }
}

// Pause slideshow on hover
document.addEventListener('mouseenter', function() {
    if (slideInterval) {
        clearInterval(slideInterval);
        clearInterval(progressInterval);
    }
});

document.addEventListener('mouseleave', function() {
    startSlideshow();
});

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    initSlideshow();
});

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, pause slideshow
        if (slideInterval) clearInterval(slideInterval);
        if (progressInterval) clearInterval(progressInterval);
    } else {
        // Page is visible, resume slideshow
        startSlideshow();
    }
});

// Clean up on page unload
window.addEventListener('beforeunload', function() {
    if (slideInterval) clearInterval(slideInterval);
    if (progressInterval) clearInterval(progressInterval);
    if (socket) {
        socket.emit('slideshow_page_leave');
    }
});

/**
 * Lock navigation during employee adding max_quantity process
 */
function lockNavigation() {
    console.log('Locking navigation - Employee adding max_quantity in progress');
    document.body.classList.add('rfid-adding-mode');
}

/**
 * Unlock navigation after max_quantity addition is complete
 */
function unlockNavigation() {
    console.log('Unlocking navigation - Max quantity addition complete');
    document.body.classList.remove('rfid-adding-mode');
}
