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
Voice Command Monitor - Monitor voice commands from globals and trigger page navigation
"""
import threading
import time
from app.modules import globals

class VoiceCommandMonitor:
    """Monitor voice commands from globals.voice_command for page navigation"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.socketio = None
        self.last_voice_command = None
        
    def set_socketio(self, socketio_instance):
        """Set the socketio instance"""
        self.socketio = socketio_instance
        
    def start_monitoring(self):
        """Start voice command monitoring in a separate thread"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.thread.start()
    
    def stop_monitoring(self):
        """Stop voice command monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        print("Voice command monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        try:
            while self.running:
                try:
                    # Get current voice command from globals
                    current_voice_command = globals.voice_command
                    
                    # Check if voice command has changed and is not None
                    if (current_voice_command is not None and 
                        current_voice_command != self.last_voice_command):
                        
                        print(f"Voice command detected: {current_voice_command}")
                        self._process_voice_command(current_voice_command)
                        
                        # Update last command and reset globals
                        self.last_voice_command = current_voice_command
                        globals.voice_command = None  # Reset after processing
                    
                    time.sleep(0.1)  # Check every 100ms
                    
                except Exception as e:
                    print(f"Voice command monitoring error: {e}")
                    time.sleep(1)  # Wait longer on error
                    
        except Exception as e:
            print(f"Voice command monitor loop error: {e}")
    
    def _process_voice_command(self, command):
        """Process voice command and trigger appropriate action"""
        command_lower = command.lower().strip()
        
        # Map voice commands to actions
        if "combo" in command_lower:
            self._handle_combo_command()
        elif "pay" in command_lower or "payment" in command_lower or "thanh toán" in command_lower:
            self._handle_payment_command()
        elif "giảm giá" in command_lower:
            self._handle_cart_command()
        else:
            print(f"Unknown voice command: {command}")
    
    def _handle_combo_command(self):
        """Handle combo/discount voice command - redirect to combo page immediately"""
        if self.socketio:
            try:
                self.socketio.emit('redirect_to_combo', {
                    'url': '/combo',
                    'message': 'Combo/Discount detected via voice! Redirecting to combo page...'
                })
                print("Emitted redirect_to_combo WebSocket event from voice command")
            except Exception as e:
                print(f"Failed to emit combo redirect event: {e}")
        else:
            print("SocketIO not initialized - cannot emit combo redirect event")
    
    def _handle_payment_command(self):
        """Handle payment voice command - check cart and redirect to payment"""
        # Check taken quantity before redirecting
        try:
            taken_quantity = globals.get_taken_quantity()
            
            # Check if any product has been taken (taken quantity > 0)
            has_products_taken = any(qty > 0 for qty in taken_quantity)
            
            if not has_products_taken:
                print("Payment voice command detected but no products taken - skipping redirect")
                
                # Send notification about empty cart
                if self.socketio:
                    try:
                        self.socketio.emit('empty_cart_notification', {
                            'message': 'Giỏ hàng trống! Vui lòng chọn sản phẩm trước khi thanh toán.'
                        })
                        print("Emitted empty_cart_notification event")
                    except Exception as e:
                        print(f"Failed to emit empty cart notification: {e}")
                        
                return
                
        except Exception as e:
            print(f"Error checking taken quantity: {e} - proceeding with redirect")
        
        if self.socketio:
            try:
                # Emit event to create order and redirect
                self.socketio.emit('create_order_and_redirect', {})
                print("Emitted create_order_and_redirect WebSocket event from voice command")
            except Exception as e:
                print(f"Failed to emit payment redirect event: {e}")
        else:
            print("SocketIO not initialized - cannot emit payment redirect event")
    
    def _handle_cart_command(self):
        """Handle cart voice command - redirect to cart page"""
        if self.socketio:
            try:
                self.socketio.emit('redirect_to_cart', {
                    'url': '/shelf',
                    'message': 'Shelf requested via voice! Redirecting to shelf page...'
                })
                print("Emitted redirect_to_cart WebSocket event from voice command")
            except Exception as e:
                print(f"Failed to emit shelf redirect event: {e}")
        else:
            print("SocketIO not initialized - cannot emit shelf redirect event")


# Global voice command monitor instance
voice_command_monitor = VoiceCommandMonitor()


def start_voice_command_monitor():
    """Start voice command monitor"""
    try:
        if voice_command_monitor.socketio is None:
            print("Voice command monitor: SocketIO not set, will start but redirects won't work")
        else:
            print("Voice command monitor: SocketIO configured properly")
            
        voice_command_monitor.start_monitoring()
        print("Voice command monitor started successfully")
    except Exception as e:
        print(f"Failed to start voice command monitor: {e}")


def stop_voice_command_monitor():
    """Stop voice command monitor"""
    try:
        voice_command_monitor.stop_monitoring()
        print("Voice command monitor stopped")
    except Exception as e:
        print(f"Failed to stop voice command monitor: {e}")


def set_socketio(socketio_instance):
    """Set the socketio instance"""
    voice_command_monitor.set_socketio(socketio_instance)
