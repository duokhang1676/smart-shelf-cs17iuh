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
Webhook routes - Handle incoming webhooks from payment providers
"""
import os
import hmac
import hashlib
import json
from flask import Blueprint, request, jsonify, current_app
from datetime import datetime
from dotenv import load_dotenv
import paho.mqtt.client as mqtt

from app.modules import globals
from app.utils.database_utils import save_order, save_order_details, load_products_from_json
from app.modules.cloud_sync import post_order_data_to_cloud
from app.utils.sound_utils import speech_text, play_sound
from app.utils.string_utils import remove_accents

load_dotenv()

webhook_bp = Blueprint('webhook', __name__)

# MQTT Client for forwarding webhook to Jetson
mqtt_client = None

def get_mqtt_client():
    """Get or create MQTT client for webhook forwarding"""
    global mqtt_client
    if mqtt_client is None:
        try:
            mqtt_client = mqtt.Client(
                client_id=f"{os.getenv('SHELF_ID', 'webhook')}_webhook",
                transport="websockets"
            )
            mqtt_client.connect(
                os.getenv("BROKER_URL"), 
                int(os.getenv("BROKER_PORT")), 
                60
            )
            mqtt_client.loop_start()
            print("[WEBHOOK] MQTT client connected")
        except Exception as e:
            print(f"[WEBHOOK] Failed to connect MQTT: {e}")
            mqtt_client = None
    return mqtt_client

@webhook_bp.route('/sepay-webhook', methods=['POST'])
def sepay_webhook():
    """
    Handle webhook notifications from SePay
    URL to configure in SePay dashboard: https://your-domain.com/webhook/sepay-webhook
    """
    try:
        # Get webhook data
        data = request.get_json()
        
        if not data:
            print("[WEBHOOK] No data received")
            return jsonify({'success': False, 'message': 'No data'}), 400
        
        print(f"[WEBHOOK] Received SePay webhook: {data}")
        
        # Validate webhook signature if SePay provides one
        # sepay_signature = request.headers.get('X-Sepay-Signature')
        # if not validate_sepay_signature(data, sepay_signature):
        #     print("[WEBHOOK] Invalid signature")
        #     return jsonify({'success': False, 'message': 'Invalid signature'}), 401
        
        # Extract transaction info
        transaction = data.get('transaction', data)  # Handle both formats
        
        transaction_id = transaction.get('id')
        amount = float(transaction.get('amount_in', 0))
        content = transaction.get('transaction_content', '')
        transaction_date = transaction.get('transaction_date', '')
        
        print(f"[WEBHOOK] Transaction: ID={transaction_id}, Amount={amount}, Content='{content}'")
        
        # Extract order_id from content (format: "Pay for snack machine OD1234567890")
        order_id = None
        if 'OD' in content:
            # Find OD followed by numbers
            import re
            match = re.search(r'OD\d+', content)
            if match:
                order_id = match.group(0)
        
        if not order_id:
            print(f"[WEBHOOK] No order_id found in content: {content}")
            return jsonify({'success': False, 'message': 'No order_id in content'}), 400
        
        print(f"[WEBHOOK] ✓ Payment detected for order: {order_id}")
        
        # CRITICAL: Publish payment notification to MQTT for Jetson to receive
        try:
            client = get_mqtt_client()
            if client:
                payment_topic = os.getenv("MQTT_PAYMENT_TOPIC", "payment/notification")
                payment_notification = {
                    "shelf_id": os.getenv("SHELF_ID"),
                    "order_id": order_id,
                    "amount": amount,
                    "transaction_id": transaction_id,
                    "content": content,
                    "timestamp": datetime.now().isoformat(),
                    "source": "webhook"
                }
                client.publish(payment_topic, json.dumps(payment_notification))
                print(f"[WEBHOOK] Published payment notification to MQTT topic: {payment_topic}")
            else:
                print("[WEBHOOK] MQTT client not available, payment notification not sent")
        except Exception as mqtt_error:
            print(f"[WEBHOOK] MQTT publish error: {mqtt_error}")
        
        # Get socketio instance and emit payment success (only if running on Jetson)
        try:
            from app.utils.loadcell_ws_utils import get_socketio_instance
            socketio_instance = get_socketio_instance()
            
            if socketio_instance:
                # Set payment verified
                globals.set_payment_verified(True)
                
                # Get cart data
                cart = current_app.config.get('cart', [])
                
                # Emit payment success event
                socketio_instance.emit('payment_received', {
                    'order_id': order_id,
                    'transaction': transaction,
                    'success': True,
                    'message': 'Thanh toán thành công!',
                    'source': 'webhook'
                })
                
                print(f"[WEBHOOK] Emitted payment_received for order {order_id}")
                
                # Save order to database
                order_details = []
                order_details_products_name = []
                
                for p in cart:
                    order_details_products_name.append(remove_accents(p.get('product_name', '')))
                    order_details.append({
                        'product_id': p.get('product_id', p.get('_id', '')),
                        'quantity': p['qty'],
                        'price': p.get('price', 0),
                        'total_price': p['qty'] * p.get('price', 0)
                    })
                
                shelf_id = os.getenv("SHELF_ID_CLOUD")
                order_data = {
                    'status': 'paid',
                    'order_code': order_id,
                    'shelf_id': shelf_id,
                    'total_bill': amount,
                    'orderDetails': order_details
                }
                
                # Post to cloud
                try:
                    post_order_data_to_cloud(order_data)
                    print(f"[WEBHOOK] Order {order_id} posted to cloud")
                except Exception as cloud_error:
                    print(f"[WEBHOOK] Failed to post to cloud: {cloud_error}")
                
                # Voice notification
                products_names_str = ", ".join(order_details_products_name)
                text = f"Cảm ơn quý khách đã mua {products_names_str}. Chúc quý khách một ngày vui vẻ!"
                speech_text(text)
                
                # Play success sound
                try:
                    sound_file = os.path.abspath(os.path.join(
                        os.path.dirname(__file__), 
                        "../..", 
                        "app/static/sounds/payment_successful.mp3"
                    ))
                    play_sound(sound_file)
                except Exception as sound_error:
                    print(f"[WEBHOOK] Sound play error: {sound_error}")
                
            else:
                print("[WEBHOOK] SocketIO instance not available")
                
        except Exception as emit_error:
            print(f"[WEBHOOK] Error emitting payment event: {emit_error}")
        
        # Return success to SePay
        return jsonify({
            'success': True,
            'message': 'Webhook processed successfully',
            'order_id': order_id
        }), 200
        
    except Exception as e:
        print(f"[WEBHOOK] Error processing webhook: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


def validate_sepay_signature(data, signature):
    """
    Validate SePay webhook signature (if provided)
    Check SePay documentation for signature generation method
    """
    if not signature:
        # If no signature is required, return True
        return True
    
    # Get webhook secret from environment
    webhook_secret = os.getenv('SEPAY_WEBHOOK_SECRET', '')
    
    if not webhook_secret:
        print("[WEBHOOK] No webhook secret configured")
        return True  # Skip validation if no secret configured
    
    # Generate expected signature
    # This is a generic HMAC-SHA256 implementation
    # Adjust based on SePay's actual signature method
    import json
    payload = json.dumps(data, separators=(',', ':'))
    expected_signature = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
