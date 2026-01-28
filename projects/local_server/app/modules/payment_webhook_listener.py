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
Payment Webhook Listener - Subscribe to MQTT payment notifications from cloud webhook
"""
import os
import json
import threading
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

from app.modules import globals
from app.utils.sound_utils import speech_text, play_sound
from app.utils.string_utils import remove_accents

load_dotenv()

# Global socketio instance
socketio_instance = None

def set_socketio(socketio):
    """Set the socketio instance for emitting events"""
    global socketio_instance
    socketio_instance = socketio
    print("[PAYMENT WEBHOOK] SocketIO instance set")

def on_connect(client, userdata, flags, rc):
    """Callback when MQTT client connects"""
    if rc == 0:
        print("[PAYMENT WEBHOOK] Connected to MQTT broker")
        # Subscribe to payment notification topic
        payment_topic = os.getenv("MQTT_PAYMENT_TOPIC", "payment/notification")
        client.subscribe(payment_topic)
        print(f"[PAYMENT WEBHOOK] Subscribed to topic: {payment_topic}")
    else:
        print(f"[PAYMENT WEBHOOK] Failed to connect, return code {rc}")

def on_message(client, userdata, msg):
    """Callback when payment notification is received"""
    try:
        payload = json.loads(msg.payload.decode())
        print(f"[PAYMENT WEBHOOK] Received payment notification: {payload}")
        
        # Extract payment info
        order_id = payload.get('order_id')
        amount = payload.get('amount')
        transaction_content = payload.get('transaction_content', '')
        
        # Check if we're currently waiting for payment
        if globals.get_payment_verified():
            print(f"[PAYMENT WEBHOOK] Payment already verified, ignoring webhook")
            return
        
        # Check if order_id is present in the transaction content (basic validation)
        if order_id and order_id in transaction_content:
            print(f"[PAYMENT WEBHOOK] ✓ Payment confirmed for order {order_id}, amount {amount}")
        else:
            print(f"[PAYMENT WEBHOOK] ✓ Payment notification received for order {order_id}, amount {amount}")
        
        # Set payment verified flag FIRST (most important step)
        globals.set_payment_verified(True)
        print(f"[PAYMENT WEBHOOK] Payment verified flag set to True")
        
        # Emit WebSocket event to frontend if socketio is available
        if socketio_instance:
            try:
                # Get Flask app instance and work within app context
                from flask import current_app
                
                # Try to get app from socketio instance
                app = getattr(socketio_instance, 'server', None)
                if app:
                    with app.app_context():
                        cart = current_app.config.get('cart', [])
                        
                        socketio_instance.emit('payment_received', {
                            'order_id': order_id,
                            'transaction': payload,
                            'success': True,
                            'message': 'Thanh toán thành công!',
                            'source': 'webhook_mqtt'
                        })
                        print(f"[PAYMENT WEBHOOK] Emitted payment_received event for order {order_id}")
                        
                        # Voice notification
                        order_details_products_name = []
                        for p in cart:
                            order_details_products_name.append(remove_accents(p.get('product_name', '')))
                        
                        if order_details_products_name:
                            products_names_str = ", ".join(order_details_products_name)
                            text = f"Cảm ơn quý khách đã mua {products_names_str}. Chúc quý khách một ngày vui vẻ!"
                            threading.Thread(target=speech_text, args=(text,), daemon=True).start()
                        
                        # Play success sound
                        try:
                            sound_file = os.path.abspath(os.path.join(
                                os.path.dirname(__file__), 
                                "../..", 
                                "app/static/sounds/payment_successful.mp3"
                            ))
                            threading.Thread(target=play_sound, args=(sound_file,), daemon=True).start()
                        except Exception as sound_error:
                            print(f"[PAYMENT WEBHOOK] Sound play error: {sound_error}")
                else:
                    # Fallback: emit without app context
                    socketio_instance.emit('payment_received', {
                        'order_id': order_id,
                        'transaction': payload,
                        'success': True,
                        'message': 'Thanh toán thành công!',
                        'source': 'webhook_mqtt'
                    })
                    print(f"[PAYMENT WEBHOOK] Emitted payment_received event (no app context)")
                    
            except Exception as emit_error:
                print(f"[PAYMENT WEBHOOK] Error emitting event: {emit_error}")
                # Continue anyway since payment_verified is already set
        else:
            print("[PAYMENT WEBHOOK] SocketIO instance not available")
            
    except json.JSONDecodeError as e:
        print(f"[PAYMENT WEBHOOK] Failed to decode message: {e}")
    except Exception as e:
        print(f"[PAYMENT WEBHOOK] Error processing payment notification: {e}")
        import traceback
        traceback.print_exc()

def start_payment_webhook_listener():
    """Start MQTT client to listen for payment webhooks"""
    def run_mqtt_client():
        try:
            # Create MQTT client
            client = mqtt.Client(
                client_id=f"{os.getenv('SHELF_ID', 'jetson')}_payment_listener",
                transport="websockets"
            )
            
            # Set callbacks
            client.on_connect = on_connect
            client.on_message = on_message
            
            # Connect to broker
            broker_url = os.getenv("BROKER_URL")
            broker_port = int(os.getenv("BROKER_PORT"))
            
            print(f"[PAYMENT WEBHOOK] Connecting to MQTT broker: {broker_url}:{broker_port}")
            client.connect(broker_url, broker_port, 60)
            
            # Start loop
            client.loop_forever()
            
        except Exception as e:
            print(f"[PAYMENT WEBHOOK] Error starting MQTT listener: {e}")
            import traceback
            traceback.print_exc()
    
    # Start MQTT client in background thread
    mqtt_thread = threading.Thread(target=run_mqtt_client, daemon=True)
    mqtt_thread.start()
    print("[PAYMENT WEBHOOK] Payment webhook listener started")
