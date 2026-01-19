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
Quantity Change Monitor - Monitor taken quantity changes and trigger page navigation
"""
import threading
import time
from app.modules import globals

class QuantityChangeMonitor:
    """Monitor taken quantity changes for automatic cart redirect from slideshow"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.socketio = None
        self.last_taken_quantity = None
        self.is_on_slideshow = False
        self.last_slideshow_change_time = 0  # Track when slideshow status last changed
        
    def set_socketio(self, socketio_instance):
        """Set the socketio instance"""
        self.socketio = socketio_instance
        
    def start_monitoring(self):
        """Start quantity change monitoring in a separate thread"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.thread.start()
    
    def stop_monitoring(self):
        """Stop quantity change monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        print("Quantity change monitor stopped")
    
    def set_slideshow_status(self, on_slideshow):
        """Set whether user is currently on slideshow page"""
        import time
        current_time = time.time()
        
        # Debounce rapid slideshow status changes (ignore if changed within 1 second)
        if current_time - self.last_slideshow_change_time < 1.0:
            print(f"Ignoring rapid slideshow status change (debounced)")
            return
        
        self.last_slideshow_change_time = current_time
        self.is_on_slideshow = on_slideshow
        
        if on_slideshow:
            # Initialize with current taken quantity when entering slideshow
            self.last_taken_quantity = globals.get_taken_quantity()
            print(f"Entered slideshow page, tracking quantity changes from: {self.last_taken_quantity}")
        else:
            print("Left slideshow page, stopping quantity tracking")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        try:
            while self.running:
                try:
                    # Only monitor when on slideshow page
                    if self.is_on_slideshow:
                        # Get current taken quantity from globals
                        current_taken_quantity = globals.get_taken_quantity()
                        
                        # Check if taken quantity has changed
                        if (self.last_taken_quantity is not None and 
                            current_taken_quantity != self.last_taken_quantity):
                            
                            print(f" Quantity change detected on slideshow!")
                            print(f"   From: {self.last_taken_quantity}")
                            print(f"   To:   {current_taken_quantity}")
                            print(f"   Triggering redirect to cart...")
                            
                            self._handle_quantity_change_redirect()
                            
                        # Update last known quantity
                        self.last_taken_quantity = current_taken_quantity
                        
                        # Debug: Show current status every 5 seconds (commented out to reduce spam)
                        # if hasattr(self, '_last_debug_time'):
                        #     if time.time() - self._last_debug_time > 5:
                        #         print(f"Monitoring slideshow (qty: {current_taken_quantity})")
                        #         self._last_debug_time = time.time()
                        # else:
                        #     self._last_debug_time = time.time()                    
                    time.sleep(0.2)  # Check every 200ms
                    
                except Exception as e:
                    print(f"Quantity change monitoring error: {e}")
                    time.sleep(1)  # Wait longer on error
                    
        except Exception as e:
            print(f"Quantity change monitor loop error: {e}")
    
    def _handle_quantity_change_redirect(self):
        """Handle quantity change - redirect to cart page for ANY change"""
        if self.socketio:
            try:
                self.socketio.emit('slideshow_quantity_changed_redirect', {
                    'url': '/cart',
                    'message': 'Quantity changed! Redirecting to cart...'
                })
                print("Emitted slideshow_quantity_changed_redirect WebSocket event")
                
                # Mark that we're no longer on slideshow since we're redirecting
                self.is_on_slideshow = False
                
            except Exception as e:
                print(f"Failed to emit quantity change redirect event: {e}")
        else:
            print("SocketIO not initialized - cannot emit quantity change redirect event")


# Global quantity change monitor instance
quantity_change_monitor = QuantityChangeMonitor()


def start_quantity_change_monitor():
    """Start quantity change monitor"""
    try:
        quantity_change_monitor.start_monitoring()
        print("Quantity change monitor started successfully")
    except Exception as e:
        print(f"Failed to start quantity change monitor: {e}")


def stop_quantity_change_monitor():
    """Stop quantity change monitor"""
    try:
        quantity_change_monitor.stop_monitoring()
        print("Quantity change monitor stopped")
    except Exception as e:
        print(f"Failed to stop quantity change monitor: {e}")


def set_socketio(socketio_instance):
    """Set the socketio instance"""
    quantity_change_monitor.set_socketio(socketio_instance)


def set_slideshow_status(on_slideshow):
    """Set whether user is currently on slideshow page"""
    quantity_change_monitor.set_slideshow_status(on_slideshow)
