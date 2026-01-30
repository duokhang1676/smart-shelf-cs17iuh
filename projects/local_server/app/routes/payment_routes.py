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
Payment routes - Handle payments, QR codes, orders
"""
import random
import time
import queue
import threading

from flask import Blueprint, render_template, request, jsonify

from app.services.vietqr_payment_service import VietQRPaymentAPI

payment_bp = Blueprint('payment', __name__)

# Define timeout used for both backend and frontend
TIMEOUT_SECONDS = 300

@payment_bp.route('/api/orders', methods=['POST'])
def api_orders():
    """Fast order creation - no QR generation here"""
    data = request.get_json() or {}
    products = data.get('products', [])
    total = data.get('total', 0)
    
    # Generate order ID with format: HD + 10 digits from time.time()
    current_time = int(time.time())
    order_id = f"HD{str(current_time)[-10:]}"
    
    # Return immediately without any heavy processing
    return jsonify({
        'id': order_id, 
        'products': products, 
        'total': total,
        'status': 'created',
        'created_at': time.time()
    })

@payment_bp.route('/qr', methods=['GET', 'POST'])
def qr_page():
    order_id = request.args.get('orderId')
    if not order_id:
        return 'Missing orderId', 400
    
    # Get total and products from body if POST (AJAX fetch), otherwise GET just renders HTML
    total = 0
    products = []
    if request.method == 'POST':
        data = request.get_json() or {}
        total = data.get('total', 0)
        products = data.get('products', [])
    else:
        try:
            total = int(request.args.get('total', 0))
        except Exception:
            total = 0
        try:
            import json
            products = json.loads(request.args.get('products', '[]'))
        except Exception:
            products = []
    
    timeout = TIMEOUT_SECONDS
    
    # Generate QR code with timeout protection
    qr_url = None
    qr_error = False
    qr_thread = None
    
    try:
        # Create a queue to get result from thread
        result_queue = queue.Queue()
        
        def generate_qr_with_timeout():
            try:
                qr_data = VietQRPaymentAPI.generate_qr(total, order_id)
                result_queue.put(('success', qr_data['data']['qrDataURL']))
            except Exception as e:
                result_queue.put(('error', str(e)))
        
        # Start QR generation in background thread
        qr_thread = threading.Thread(target=generate_qr_with_timeout, daemon=True)
        qr_thread.start()
        
        # Wait for result with 3 second timeout
        qr_thread.join(timeout=3)
        
        if qr_thread.is_alive():
            # Timeout occurred
            print(f'QR generation timeout for order {order_id}')
            qr_error = True
        else:
            # Get result
            try:
                status, result = result_queue.get_nowait()
                if status == 'success':
                    qr_url = result
                else:
                    print(f'QR generation error: {result}')
                    qr_error = True
            except queue.Empty:
                qr_error = True
                
    except Exception as e:
        print(f'QR generation exception: {e}')
        qr_error = True
    
    # If AJAX/fetch or ?json=1, return JSON
    if request.method == 'POST' or request.headers.get('Accept', '').startswith('application/json') or request.args.get('json') == '1':
        return jsonify({
            'qrUrl': qr_url, 
            'total': total, 
            'orderId': order_id, 
            'timeout': timeout, 
            'products': products,
            'qr_error': qr_error
        })
    
    # Otherwise, return HTML
    return render_template('qr.html', total=total, qr_base64=qr_url, order_id=order_id, qr_error=qr_error)
