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
from datetime import datetime
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

from app.modules import globals
from app.utils.sound_utils import speech_text, play_sound
from app.utils.string_utils import remove_accents
from app.modules.cloud_sync import post_order_data_to_cloud

load_dotenv()

# Global socketio and app instances
socketio_instance = None
flask_app = None

def set_socketio(socketio, app=None):
    """Set the socketio instance and Flask app for emitting events"""
    global socketio_instance, flask_app
    socketio_instance = socketio
    flask_app = app
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
        if not order_id or order_id not in transaction_content:
            print(f"[PAYMENT WEBHOOK] ✗ Invalid order_id or transaction content mismatch")
            return
        
        print(f"[PAYMENT WEBHOOK] Processing payment for order {order_id}, amount {amount}")
        
        # Get cart info for building order data if Flask app is available
        cart = []
        total_bill = 0
        if flask_app:
            try:
                with flask_app.app_context():
                    from flask import current_app
                    cart = current_app.config.get('cart', [])
            except Exception as cart_error:
                print(f"[PAYMENT WEBHOOK] Could not get cart: {cart_error}")
        
        # Build order data and order details (like polling does)
        # IMPORTANT: Only include products with qty > 0 (actually purchased)
        order_details = []
        order_details_products_name = []
        
        for p in cart:
            qty = p.get('qty', 0)
            
            # Skip products with zero quantity
            if qty <= 0:
                continue
            
            price = p.get('price', 0)
            total_price = qty * price
            
            order_details_products_name.append(remove_accents(p.get('product_name', '')))
            order_details.append({
                'product_id': p.get('product_id', p.get('_id', '')),
                'quantity': qty,
                'price': price,
                'total_price': total_price
            })
            total_bill += total_price
        
        # CRITICAL: Verify amount matches total_bill
        if total_bill > 0:
            if amount < total_bill:
                print(f"[PAYMENT WEBHOOK] ✗ PAYMENT REJECTED - Amount mismatch!")
                print(f"[PAYMENT WEBHOOK]   Received: {amount} VND")
                print(f"[PAYMENT WEBHOOK]   Expected: {total_bill} VND")
                print(f"[PAYMENT WEBHOOK]   Difference: {total_bill - amount} VND short")
                # Do NOT set payment_verified flag
                # Do NOT emit success event
                return
            else:
                print(f"[PAYMENT WEBHOOK] ✓ Payment amount verified: {amount} >= {total_bill}")
        
        # Set payment verified flag ONLY after amount verification
        globals.set_payment_verified(True)
        print(f"[PAYMENT WEBHOOK] Payment verified flag set to True")
        
        shelf_id = os.getenv("SHELF_ID_CLOUD")
        order_data = {
            'status': 'paid',
            'order_code': order_id,
            'shelf_id': shelf_id,
            'total_bill': total_bill if total_bill > 0 else amount,  # Use webhook amount if cart unavailable
            'orderDetails': order_details
        }
        
        print(f"[PAYMENT WEBHOOK] Payment successful! Order {order_id}, transaction: {payload.get('transaction_id', 'N/A')}")
        
        # Emit WebSocket event to frontend if socketio is available
        if socketio_instance:
            try:
                socketio_instance.emit('payment_received', {
                    'order_id': order_id,
                    'transaction': payload,
                    'success': True,
                    'message': 'Thanh toán thành công!',
                    'source': 'webhook_mqtt'
                })
                print(f"[PAYMENT WEBHOOK] Emitted payment_received event for order {order_id}")
                
            except Exception as emit_error:
                print(f"[PAYMENT WEBHOOK] Error emitting event: {emit_error}")
                import traceback
                traceback.print_exc()
        
        # Play success sound (ting.mp3 like polling)
        try:
            sound_file = os.path.abspath(os.path.join(
                os.path.dirname(__file__), 
                "../..", 
                "app/static/sounds/ting.mp3"
            ))
            threading.Thread(target=play_sound, args=(sound_file,), daemon=True).start()
        except Exception as sound_error:
            print(f"[PAYMENT WEBHOOK] Sound play error: {sound_error}")
        
        # Voice notification with total amount (like polling)
        total_price = order_data['total_bill']
        threading.Thread(
            target=speech_text, 
            args=(f"Thanh toán thành công {total_price} đồng",), 
            daemon=True
        ).start()
        
        # Send order data to cloud
        print("[PAYMENT WEBHOOK] Send order data to cloud")
        print(order_data)
        threading.Thread(target=post_order_data_to_cloud, args=(order_data,), daemon=True).start()
        
        # Print bill if requested
        if globals.get_print_bill() and order_details:
            print("[PAYMENT WEBHOOK] Printing bill...")
            try:
                def format_currency(amount):
                    return f"{amount:,}".replace(',', '.')
                
                bill_file_path = os.path.abspath(os.path.join(
                    os.path.dirname(__file__), 
                    "../..", 
                    "app/static/txt/bill.txt"
                ))
                
                with open(bill_file_path, "w", encoding="utf-8") as f:
                    f.write("       KỆ HÀNG CS17IUH        \n")
                    f.write("                              \n")
                    f.write("  Địa chi: 12 Nguyên Văn Bao, \n")
                    f.write("  Phường Hạnh Thông, TP.HCM   \n")
                    f.write("       SDT: 0356972399        \n")
                    f.write(" ---------------------------- \n")
                    f.write("       HÓA ĐƠN BÁN HÀNG       \n")
                    f.write("                              \n")
                    f.write(f" Mã HD    : {order_data['order_code']}\n")
                    f.write(f" Kệ hàng  : CS17IUH-01 \n")
                    f.write(f" Thời gian: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
                    f.write(" ---------------------------- \n")
                    f.write("     SL     Giá bán   T.Tiên  \n")
                    f.write(" ---------------------------- \n")

                    for i, item in enumerate(order_details):
                        f.write(f" {order_details_products_name[i]:<28} \n")
                        f.write(f"     {item['quantity']:<7}{format_currency(item['price']):<10}{format_currency(item['total_price'])}\n")
                    
                    f.write("                              \n")
                    f.write(" ---------------------------- \n")
                    f.write(f" THANH TOÁN:      {format_currency(order_data['total_bill'])} VND \n")
                    f.write(" ---------------------------- \n")
                    f.write("                              \n")
                    f.write("                              \n")
                    f.write("       Cam ơn quý khách!      \n")

                print(f"[PAYMENT WEBHOOK] Hóa đơn đã được lưu vào {bill_file_path}")
            except Exception as bill_error:
                print(f"[PAYMENT WEBHOOK] Error printing bill: {bill_error}")
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
