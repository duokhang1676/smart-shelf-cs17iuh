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
# WebSocket and thread-safety utilities extracted from update_loadcell_quantity.py
import time
from app.utils.websocket_utils import emit_connection_status

# Global variable to store socketio instance
socketio_instance = None

WEBSOCKET_AVAILABLE = True

def set_socketio_instance(socketio):
    """Set the socketio instance for emitting connection status"""
    global socketio_instance
    socketio_instance = socketio
    print(f"SocketIO instance set: {socketio_instance is not None}")

def get_socketio_instance():
    """Get the current socketio instance"""
    return socketio_instance

# Thread-safe notification handler factory
def notification_handler_factory(device_name, globals):
    def handler(sender, data):
        data_list = list(data)
        with globals.loadcell_lock:
            if device_name == "Loadcell_1":
                globals.loadcell_quantity[:globals.LOADCELL_NUM_1] = data_list
            else:
                globals.loadcell_quantity[globals.LOADCELL_NUM_1:globals.LOADCELL_NUM_TOTAL] = data_list[:globals.LOADCELL_NUM_2]
            # Update last data reception timestamp to indicate active connection
            globals.last_data_reception_time = time.time()
        # Emit immediate data update via WebSocket (minimal processing for speed)
        if WEBSOCKET_AVAILABLE and socketio_instance:
            try:
                # Get current data snapshot efficiently
                current_data = globals.get_taken_quantity()
                # Convert numpy int32 to regular int for JSON serialization
                current_data_list = [int(x) for x in current_data] if hasattr(current_data, '__iter__') else current_data
                # Emit immediately with minimal data
                socketio_instance.emit('loadcell_update', {
                    'loadcell_data': current_data_list,
                    'device_name': device_name,
                    'timestamp': time.time()
                })
                # Also emit connection status (but secondary priority)
                emit_connection_status(socketio_instance, "connected", f"{device_name} active")
            except Exception as e:
                pass
    return handler

def emit_connecting_status(device_name):
    if WEBSOCKET_AVAILABLE and socketio_instance:
        try:
            emit_connection_status(socketio_instance, "connecting", f"{device_name} connecting...")
        except Exception as e:
            pass

def emit_connected_status(device_name):
    if WEBSOCKET_AVAILABLE and socketio_instance:
        try:
            emit_connection_status(socketio_instance, "connected", f"{device_name} connected successfully!")
        except Exception as e:
            pass

def emit_error_status(device_name, error):
    if WEBSOCKET_AVAILABLE and socketio_instance:
        try:
            if "was not found" in str(error):
                emit_connection_status(socketio_instance, "error", f"{device_name} device not found - Check Bluetooth")
            else:
                emit_connection_status(socketio_instance, "error", f"{device_name} connection error: {str(error)}")
        except Exception as ws_error:
            pass
