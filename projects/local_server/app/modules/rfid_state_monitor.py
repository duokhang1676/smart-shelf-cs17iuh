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
RFID State Monitor - Monitor RFID state changes for employee max_quantity management
"""
import threading
import time
from app.modules import globals

class RFIDStateMonitor:
    """Monitor RFID state changes for employee max_quantity management"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.socketio = None
        self.last_bool_rfid = None
        self.last_rfid_state = None
        
    def set_socketio(self, socketio_instance):
        """Set the socketio instance"""
        self.socketio = socketio_instance
        
    def start_monitoring(self):
        """Start RFID state monitoring in a separate thread"""
        if not self.running:
            self.running = True
            self.thread = threading.Thread(target=self._monitor_loop, daemon=True)
            self.thread.start()
    
    def stop_monitoring(self):
        """Stop RFID state monitoring"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1)
        print("RFID state monitor stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop"""
        try:
            while self.running:
                try:
                    # Get current RFID states from globals
                    current_bool_rfid = globals.get_bool_rfid_devices()
                    current_rfid_state = globals.get_rfid_state()
                    
                    # Check if bool_rfid changed to True
                    if (current_bool_rfid != self.last_bool_rfid and current_bool_rfid == True):
                        print(f"RFID state change detected: bool_rfid={current_bool_rfid}, rfid_state={current_rfid_state}")
                        self._process_rfid_state_change(current_bool_rfid, current_rfid_state)
                        
                        # Reset bool_rfid to False after processing
                        globals.set_bool_rfid_devices(False)
                        print("Reset bool_rfid_devices to False after processing")
                    
                    # Update last known states
                    self.last_bool_rfid = current_bool_rfid
                    self.last_rfid_state = current_rfid_state
                    
                    time.sleep(0.1)  # Check every 100ms
                    
                except Exception as e:
                    print(f"RFID state monitoring error: {e}")
                    time.sleep(1)  # Wait longer on error
                    
        except Exception as e:
            print(f"RFID state monitor loop error: {e}")
    
    def _process_rfid_state_change(self, bool_rfid, rfid_state):
        """Process RFID state change and trigger appropriate action"""
        if bool_rfid == True:
            if rfid_state == 1:
                # Employee adding max_quantity - redirect to shelf page
                self._handle_employee_adding_max_quantity()
            elif rfid_state == 0:
                # Max_quantity added successfully - show notification
                self._handle_max_quantity_added_successfully()
            else:
                print(f"Unknown rfid_state value: {rfid_state}")
    
    def _handle_employee_adding_max_quantity(self):
        """Handle employee adding max_quantity - redirect to shelf page"""
        if self.socketio:
            try:
                self.socketio.emit('employee_adding_max_quantity', {
                    'url': '/shelf',
                    'message': 'Nhân viên đang thêm hàng. Chuyển đến trang kệ hàng...'
                })
                print("Emitted employee_adding_max_quantity WebSocket event - redirecting to shelf")
            except Exception as e:
                print(f"Failed to emit employee adding max_quantity event: {e}")
        else:
            print("SocketIO not initialized - cannot emit employee adding max_quantity event")

    def _handle_max_quantity_added_successfully(self):
        """Handle max_quantity added successfully - show notification"""
        if self.socketio:
            try:
                self.socketio.emit('max_quantity_added_notification', {
                    'message': 'Thêm sản phẩm thành công! Đã cập nhật số lượng sản phẩm.',
                    'type': 'success'
                })
                print("Emitted max_quantity_added_notification WebSocket event")
            except Exception as e:
                print(f"Failed to emit max_quantity added notification: {e}")
        else:
            print("SocketIO not initialized - cannot emit max_quantity added notification")


# Global RFID state monitor instance
rfid_state_monitor = RFIDStateMonitor()


def start_rfid_state_monitor():
    """Start RFID state monitor"""
    try:
        rfid_state_monitor.start_monitoring()
        print("RFID state monitor started successfully")
    except Exception as e:
        print(f"Failed to start RFID state monitor: {e}")


def stop_rfid_state_monitor():
    """Stop RFID state monitor"""
    try:
        rfid_state_monitor.stop_monitoring()
        print("RFID state monitor stopped")
    except Exception as e:
        print(f"Failed to stop RFID state monitor: {e}")


def set_socketio(socketio_instance):
    """Set the socketio instance"""
    rfid_state_monitor.set_socketio(socketio_instance)
