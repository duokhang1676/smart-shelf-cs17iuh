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
class NavigationUtils {
    constructor() {
        this.socket = null; // Single socket instance
        // Initialize when DOM is ready or immediately if already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
        this.setupConnectionMonitoring();
    }

    initialize() {
        this.preloadFonts();
        this.setupNavigationEffects();
        this.setupActivePageDetection();
        this.setupMobileNavigation();
        this.setupConnectionStatus();
        this.updateCartBadge();
        this.setupWebSocketListener();
        this.setupSettingsDropdown();
        this.setupLogoNavigation();
    }

    preloadFonts() {
        // Add font loading class to body for loading animation
        document.body.classList.add('font-loading');
        
        // Create invisible elements to trigger font download for both Aladin and Montserrat
        const aladinPreloader = document.createElement('span');
        aladinPreloader.className = 'font-preloader aladin-preloader';
        aladinPreloader.style.fontFamily = "'Aladin', 'Comic Sans MS', cursive, fantasy";
        aladinPreloader.textContent = 'CS17IUH Brand Text';
        
        const montserratPreloader = document.createElement('span');
        montserratPreloader.className = 'font-preloader montserrat-preloader';
        montserratPreloader.style.fontFamily = "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        montserratPreloader.textContent = 'Headers Content Navigation Menu 0123456789';
        
        document.body.appendChild(aladinPreloader);
        document.body.appendChild(montserratPreloader);
        
        // Check if fonts are loaded using Font Face API (if available)
        if ('fonts' in document) {
            Promise.all([
                document.fonts.load('400 1em Aladin'),
                document.fonts.load('400 1em Montserrat'),
                document.fonts.load('500 1em Montserrat'),
                document.fonts.load('600 1em Montserrat')
            ]).then(() => {
                // Fonts loaded successfully
                document.body.classList.remove('font-loading');
                document.body.classList.add('fonts-loaded');
                this.cleanupPreloaders();
            }).catch(() => {
                // Fallback if font loading fails
                setTimeout(() => {
                    document.body.classList.remove('font-loading');
                    document.body.classList.add('fonts-loaded');
                    this.cleanupPreloaders();
                }, 3000);
            });
        } else {
            // Fallback for browsers without Font Face API
            setTimeout(() => {
                document.body.classList.remove('font-loading');
                document.body.classList.add('fonts-loaded');
                this.cleanupPreloaders();
            }, 3000);
        }
    }
    
    cleanupPreloaders() {
        // Remove preloader elements
        const preloaders = document.querySelectorAll('.font-preloader');
        preloaders.forEach(preloader => {
            if (preloader.parentNode) {
                preloader.parentNode.removeChild(preloader);
            }
        });
    }

    setupNavigationEffects() {
        const navLinks = document.querySelectorAll('.nav-link');
        
        navLinks.forEach(link => {
            // Click animation
            link.addEventListener('click', (e) => {
                this.animateClick(link);
            });

            // Hover effects
            link.addEventListener('mouseenter', () => {
                this.animateHover(link, true);
            });

            link.addEventListener('mouseleave', () => {
                this.animateHover(link, false);
            });
        });
    }

    setupMobileNavigation() {
        const toggle = document.querySelector('.nav-toggle');
        const mobileMenu = document.querySelector('.nav-mobile-menu');
        
        if (toggle && mobileMenu) {
            toggle.addEventListener('click', () => {
                mobileMenu.classList.toggle('show');
                this.animateToggle(toggle, mobileMenu.classList.contains('show'));
            });

            // Close mobile menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!toggle.contains(e.target) && !mobileMenu.contains(e.target)) {
                    mobileMenu.classList.remove('show');
                    this.animateToggle(toggle, false);
                }
            });
        }
    }

    setupConnectionStatus() {
        // Initialize connection status indicators
        this.updateConnectionStatus('checking', 'checking');
        
        // Check status every 30 seconds
        setInterval(() => {
            this.checkConnectionStatus();
        }, 30000);
        
        // Initial check
        setTimeout(() => {
            this.checkConnectionStatus();
        }, 1000);
    }

    setupConnectionMonitoring() {
        // Create single socket connection for navigation
        if (typeof io !== 'undefined' && !this.socket) {
            this.socket = io();
            
            this.socket.on('loadcell_status', (data) => {
                const status = data.connected ? 'connected' : 'error';
                this.updateConnectionStatus(status, null);
            });
            
            this.socket.on('rfid_status', (data) => {
                const status = data.connected ? 'connected' : 'error';
                this.updateConnectionStatus(null, status);
            });
        }
    }

    animateClick(element) {
        element.style.transform = 'scale(0.95)';
        setTimeout(() => {
            element.style.transform = '';
        }, 150);
    }

    animateHover(element, isHovering) {
        if (isHovering && !element.classList.contains('active')) {
            element.style.transform = 'translateY(-2px)';
        } else if (!isHovering && !element.classList.contains('active')) {
            element.style.transform = '';
        }
    }

    animateToggle(toggle, isOpen) {
        const spans = toggle.querySelectorAll('span');
        spans.forEach((span, index) => {
            if (isOpen) {
                if (index === 0) {
                    span.style.transform = 'rotate(-45deg) translate(-6px, 6px)';
                } else if (index === 1) {
                    span.style.opacity = '0';
                } else if (index === 2) {
                    span.style.transform = 'rotate(45deg) translate(-6px, -6px)';
                }
            } else {
                span.style.transform = '';
                span.style.opacity = '';
            }
        });
    }

    updateConnectionStatus(loadcellStatus = null, rfidStatus = null) {
        const loadcellDot = document.querySelector('#loadcellStatus, .loadcell-status');
        const rfidDot = document.querySelector('#rfidStatus, .rfid-status');
        
        if (loadcellStatus && loadcellDot) {
            loadcellDot.className = 'nav-status-dot';
            loadcellDot.classList.add(loadcellStatus);
        }
        
        if (rfidStatus && rfidDot) {
            rfidDot.className = 'nav-status-dot';
            rfidDot.classList.add(rfidStatus);
        }
    }

    async checkConnectionStatus() {
        try {
            const response = await fetch('/api/debug/connection-status');
            if (response.ok) {
                const data = await response.json();
                const loadcellStatus = data.loadcell_connected ? 'connected' : 'error';
                const rfidStatus = data.rfid_status?.connected ? 'connected' : 'error';
                
                this.updateConnectionStatus(loadcellStatus, rfidStatus);
            } else {
                this.updateConnectionStatus('error', 'error');
            }
        } catch (error) {
            console.warn('Could not check connection status:', error);
            this.updateConnectionStatus('error', 'error');
        }
    }

    setupActivePageDetection() {
        const currentPath = window.location.pathname;
        const navLinks = document.querySelectorAll('.nav-link:not(.nav-dropdown .nav-link)');
        
        navLinks.forEach(link => {
            const linkPath = new URL(link.href).pathname;
            if (linkPath === currentPath || 
                (currentPath === '/' && linkPath === '/') ||
                (currentPath.startsWith('/slideshow') && linkPath === '/')) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        
        // Handle settings dropdown link separately
        const settingsLink = document.querySelector('.nav-dropdown .nav-link');
        if (settingsLink) {
            if (currentPath === '/setting' || currentPath.startsWith('/sensor-data') || currentPath.startsWith('/mobile-app')) {
                settingsLink.classList.add('active');
            } else {
                settingsLink.classList.remove('active');
            }
        }
    }

    navigateTo(url) {
        this.showLoadingState();
        window.location.href = url;
    }

    showLoadingState() {
        const container = document.querySelector('.container');
        if (container) {
            container.style.opacity = '0.7';
            container.style.transition = 'opacity 0.3s ease';
        }
    }

    // Utility method to add navigation to any page
    static addToPage(activePageKey = null) {
        const navigation = new NavigationUtils();
        
        // Set active page if provided
        if (activePageKey) {
            setTimeout(() => {
                const activeSelector = `.nav-link[href*="${activePageKey}"]`;
                const activeLink = document.querySelector(activeSelector);
                if (activeLink) {
                    document.querySelectorAll('.nav-link').forEach(link => {
                        link.classList.remove('active');
                    });
                    activeLink.classList.add('active');
                }
            }, 100);
        }
        
        return navigation;
    }

    // Method to highlight cart when items are added
    highlightCart(duration = 2000) {
        const cartLink = document.querySelector('.nav-link[href="/cart"]');
        if (cartLink) {
            cartLink.style.animation = 'pulse 0.6s ease-in-out';
            setTimeout(() => {
                cartLink.style.animation = '';
            }, duration);
        }
    }

    // Method to show notification badge on navigation items
    showBadge(page, count) {
        const pageLink = document.querySelector(`.nav-link[href*="${page}"]`);
        if (pageLink) {
            const navText = pageLink.querySelector('.nav-text');
            if (navText) {
                let badge = navText.querySelector('.nav-badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'nav-badge';
                    navText.appendChild(badge);
                }
                
                // Hide badge if count is 0 or negative
                if (count <= 0) {
                    badge.classList.add('hidden');
                    badge.textContent = '';
                } else {
                    badge.textContent = count;
                    badge.classList.remove('hidden');
                }
            }
        }
    }

    // Method to update cart badge based on current cart status
    updateCartBadge() {
        // Skip if we're already on cart page (cart.js handles this)
        if (window.location.pathname === '/cart') {
            return;
        }

        // Check for cart data from loadcell or API
        try {
            // Try to get cart data from API
            fetch('/api/cart/status')
                .then(response => response.ok ? response.json() : Promise.reject(new Error('HTTP ' + response.status)))
                .then(data => {
                    // The API returns { cart_summary: { total_quantity, ... }, cart_items: [...] }
                    let totalItems = 0;
                    if (data && data.cart_summary && typeof data.cart_summary.total_quantity === 'number') {
                        totalItems = data.cart_summary.total_quantity;
                    } else if (data && Array.isArray(data.cart_items)) {
                        totalItems = data.cart_items
                            .filter(item => (item.quantity || item.qty || 0) > 0)
                            .reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0);
                    }
                    this.showBadge('/cart', totalItems);
                })
                .catch(error => {
                    console.log('Cart status check failed:', error);
                    this.showBadge('/cart', 0);
                });
        } catch (error) {
            console.log('Cart badge update error:', error);
            this.showBadge('/cart', 0);
        }
    }

    // Setup WebSocket listener for real-time cart updates
    setupWebSocketListener() {
        // Skip if we're on cart page (cart.js handles this)
        if (window.location.pathname === '/cart') {
            return;
        }

        // Reuse existing socket connection for WebSocket events
        if (this.socket) {
            try {
                // Listen for loadcell updates
                this.socket.on('loadcell_update', (data) => {
                    console.log('🔔 Navigation received loadcell update:', data);
                    
                    if (data.cart && Array.isArray(data.cart)) {
                        // Calculate total items from cart
                        const totalItems = data.cart
                            .filter(item => (item.quantity || item.qty || 0) > 0)
                            .reduce((sum, item) => sum + (item.quantity || item.qty || 0), 0);
                        
                        this.showBadge('/cart', totalItems);
                        console.log(`Cart badge updated: ${totalItems} items`);
                    }
                });

                // Listen for cart updates
                this.socket.on('cart_update', (data) => {
                    console.log('🔔 Navigation received cart update:', data);
                    this.updateCartBadge();
                });

                // Listen for employee adding event - redirect to shelf page if not already there
                this.socket.on('employee_adding_max_quantity', (data) => {
                    console.log('🔔 Navigation received employee_adding_max_quantity:', data);
                    
                    // Lock navigation immediately when entering adding mode
                    if (typeof window.lockNavigation === 'function') {
                        window.lockNavigation();
                        console.log('Navigation locked during employee adding');
                    }
                    
                    // Redirect to shelf page if not already there
                    if (window.location.pathname !== '/shelf') {
                        console.log('Redirecting to shelf page for employee adding...');
                        window.location.href = data.url || '/shelf';
                    }
                });

            } catch (error) {
                console.log('WebSocket setup failed:', error);
            }
        } else {
            console.log('Socket not available for navigation updates');
        }
    }

    // Settings dropdown functionality
    setupSettingsDropdown() {
        // Setup dropdown functionality
        window.toggleSettingsDropdown = (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            const dropdown = document.getElementById('settingsDropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        };

        // Close dropdown when clicking outside
        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById('settingsDropdown');
            const navDropdown = document.querySelector('.nav-dropdown');
            
            if (dropdown && navDropdown && !navDropdown.contains(event.target)) {
                dropdown.classList.remove('show');
            }
        });

        // Handle dropdown navigation
        document.addEventListener('click', (event) => {
            if (event.target.closest('.dropdown-item')) {
                const href = event.target.closest('.dropdown-item').getAttribute('href');
                if (href && href !== '#') {
                    window.location.href = href;
                }
            }
        });
    }

    // Logo navigation functionality
    setupLogoNavigation() {
        // Find logo elements - common selectors for CS17IUH logo
        const logoSelectors = [
            '.nav-brand', 
            '.brand', 
            '.logo', 
            '.nav-logo',
            '[href="/"]',
            'a[href="#"]:contains("CS17IUH")',
            '*:contains("CS17IUH")'
        ];

        let logoElement = null;

        // Try to find logo element using different selectors
        for (const selector of logoSelectors) {
            const element = document.querySelector(selector);
            if (element && (
                element.textContent.includes('CS17IUH') || 
                element.innerHTML.includes('CS17IUH') ||
                element.classList.contains('brand') ||
                element.classList.contains('logo')
            )) {
                logoElement = element;
                break;
            }
        }

        // If not found by selector, search by text content
        if (!logoElement) {
            const allElements = document.querySelectorAll('*');
            for (const element of allElements) {
                if (element.textContent.trim() === 'CS17IUH' || 
                    element.textContent.includes('CS17IUH')) {
                    // Make sure it's likely a navigation logo
                    const nav = element.closest('nav, .nav, .navigation, .navbar, header');
                    if (nav) {
                        logoElement = element;
                        break;
                    }
                }
            }
        }

        // Add click event listener to logo
        if (logoElement) {
            console.log('Logo element found:', logoElement);
            
            // Make sure it's clickable
            logoElement.style.cursor = 'pointer';
            
            // Add click event listener
            logoElement.addEventListener('click', (event) => {
                event.preventDefault();
                console.log('CS17IUH logo clicked - navigating to shelf page');
                
                // Add click animation
                this.animateClick(logoElement);
                
                // Navigate to shelf page
                setTimeout(() => {
                    window.location.href = '/shelf';
                }, 150); // Small delay for animation
            });

            console.log('Logo navigation setup complete - clicking CS17IUH will go to /shelf');
        } else {
            console.warn('CS17IUH logo element not found for navigation setup');
        }
    }
}

// Initialize navigation on page load
const navigation = new NavigationUtils();

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.NavigationUtils = NavigationUtils;
    
    // Global navigation locking functions
    window.lockNavigation = function() {
        console.log('Locking navigation globally - Employee adding max_quantity in progress');
        document.body.classList.add('rfid-adding-mode');
    };
    
    window.unlockNavigation = function() {
        console.log('Unlocking navigation globally - Max quantity addition complete');
        document.body.classList.remove('rfid-adding-mode');
    };
}
