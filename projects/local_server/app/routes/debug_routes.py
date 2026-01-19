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
Debug routes - Debug endpoints and monitoring
"""
import os
import re
import requests
import time
from datetime import datetime

from flask import Blueprint, jsonify, current_app, request

from app.modules import globals
from app.utils.loadcell_utils import (
    has_real_data, 
    has_any_data, 
    get_error_codes_info
)
# from app.webserver import socketio
from app.utils.websocket_utils import emit_loadcell_update

debug_bp = Blueprint('debug', __name__)

def get_socketio():
    """Lazy import to avoid circular import"""
    from app.webserver import socketio
    return socketio

def get_cart():
    """Helper function to get cart from app context"""
    return current_app.config.get('cart', [])

def get_loadcell_status():
    """Helper function to get loadcell status from app context"""
    return (
        current_app.config.get('loadcell_connected', False),
        current_app.config.get('loadcell_connection_status', 'disconnected')
    )

@debug_bp.route('/debug')
def api_debug():
    """Debug endpoint to check current state"""
    cart = get_cart()
    
    debug_info = {
        'loadcell_quantity': globals.loadcell_quantity,
        'cart_length': len(cart),
        'cart_with_qty': [],
        'error_codes': get_error_codes_info(),
        'rfid_status': {
            'hardware_listener': True,
            'api_disabled': True,
            'valid_codes_count': len(globals.rfids) if hasattr(globals, 'rfids') else 0
        }
    }
    
    for idx, p in enumerate(cart):
        loadcell_val = globals.loadcell_quantity[idx] if idx < len(globals.loadcell_quantity) else 'N/A'
        error_status = ""
        
        if loadcell_val == 255:
            error_status = "LOADCELL_ERROR"
        elif loadcell_val == 222 or loadcell_val == 200:
            error_status = "PLACEMENT_ERROR"
        
        debug_info['cart_with_qty'].append({
            'index': idx,
            'product_id': p.get('_id', ''),
            'product_name': p.get('product_name', '')[:50],
            'qty': p.get('qty', 0),
            'loadcell_value': loadcell_val,
            'error_status': error_status
        })
    
    return jsonify(debug_info)

@debug_bp.route('/debug/connection-status')
def debug_connection_status():
    """Debug endpoint to check detailed connection status"""
    loadcell_connected, loadcell_connection_status = get_loadcell_status()
    
    return jsonify({
        'loadcell_connected': loadcell_connected,
        'loadcell_connection_status': loadcell_connection_status,
        'current_data': globals.get_loadcell_quantity_snapshot(),
        'has_real_data': has_real_data(),
        'has_any_data': has_any_data(),
        'data_summary': {
            'total_slots': len(globals.get_loadcell_quantity_snapshot()),
            'non_zero_slots': sum(1 for val in globals.get_loadcell_quantity_snapshot() if val != 0),
            'error_slots': sum(1 for val in globals.get_loadcell_quantity_snapshot() if val in [200, 222, 255]),
            'valid_data_slots': sum(1 for val in globals.get_loadcell_quantity_snapshot() if val > 0 and val not in [200, 222, 255])
        },
        'timestamp': time.time()
    })

@debug_bp.route('/debug/current_state')
def debug_current_state():
    """Debug endpoint to check current application state"""
    cart = get_cart()
    
    state_info = {
        'loadcell_quantity': globals.loadcell_quantity,
        'cart_length': len(cart),
        'cart_with_qty': [
            {
                'index': idx,
                'product_name': p.get('product_name', 'Unknown')[:30],
                'qty': p.get('qty', 0),
                'price': p.get('price', 0),
                'loadcell_val': globals.loadcell_quantity[idx] if idx < len(globals.loadcell_quantity) else 'N/A'
            }
            for idx, p in enumerate(cart[:10])  # First 10 items only
        ],
        'error_codes': get_error_codes_info(),
        'has_real_data': has_real_data(),
        'has_any_data': has_any_data()
    }
    
    return jsonify(state_info)

@debug_bp.route('/debug/sepay-status')
def sepay_status():
    """Check SEPAY token status"""
    
    token = os.getenv("SEPAY_AUTH_TOKEN")
    bank_account_id = os.getenv("SEPAY_BANK_ACCOUNT_ID")
    url = os.getenv("SEPAY_TRANSACTION_URL")
    
    if not token:
        return jsonify({
            "status": "error",
            "message": "SEPAY_AUTH_TOKEN not configured"
        }), 500
    
    # Test API call
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "limit": 1,
        "transaction_date_min": datetime.now().strftime("%Y-%m-%d")
    }
    
    if bank_account_id:
        params["account_number"] = bank_account_id
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        response_data = None
        if response.text:
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text[:200]}
        
        return jsonify({
            "status": "success" if response.status_code == 200 else "error",
            "status_code": response.status_code,
            "token_last_4": token[-4:] if token else None,
            "bank_account_id": bank_account_id,
            "url": url,
            "params": params,
            "response_data": response_data,
            "message": "New API working!" if response.status_code == 200 else f"HTTP {response.status_code} - Check token or API format"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"API call failed: {str(e)}",
            "token_last_4": token[-4:] if token else None,
            "url": url,
            "params": params
        }), 500

@debug_bp.route('/debug/test-payment-match/<order_id>')
def test_payment_match(order_id):
    """Test payment matching logic"""
    
    token = os.getenv("SEPAY_AUTH_TOKEN")
    bank_account_id = os.getenv("SEPAY_BANK_ACCOUNT_ID")
    url = os.getenv("SEPAY_TRANSACTION_URL")
    
    if not token:
        return jsonify({
            "status": "error",
            "message": "SEPAY_AUTH_TOKEN not configured"
        }), 500
    
    add_info = f"Pay for snack machine {order_id}"
    amount = request.args.get('amount', '10000')
    today = datetime.now().strftime("%Y-%m-%d")
    
    params = {
        "transaction_date_min": today,
        "limit": 20
    }
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"API returned {response.status_code}",
                "response": response.text[:200]
            }), 500
            
        data = response.json()
        
        if not data.get("messages", {}).get("success"):
            return jsonify({
                "status": "error", 
                "message": "API call not successful",
                "data": data
            }), 500
            
        transactions = data.get("transactions", [])
        
        # Debug: Add raw API response info
        api_debug_info = {
            "api_url": url,
            "api_params": params,
            "api_status_code": response.status_code,
            "api_success": data.get("messages", {}).get("success"),
            "raw_transactions_count": len(transactions),
            "raw_transactions_sample": transactions[:2] if transactions else []  # First 2 for debugging
        }
        
        # Apply matching logic
        matches = []
        for tx in transactions:
            content = tx.get("transaction_content", "")
            tx_date = tx.get("transaction_date", "")
            tx_amount = float(tx.get("amount_in", 0))
            
            # Check amount match (for display purposes, but not used in overall matching)
            amount_match = abs(tx_amount - float(amount)) < 0.01
            
            # Check date match
            date_match = tx_date.startswith(today)
            order_id_match = order_id and order_id in content
            overall_match = date_match and order_id_match
            
            matches.append({
                "transaction_id": tx.get("id", ""),
                "content": content,
                "amount": tx_amount,
                "date": tx_date,
                "amount_match": amount_match,
                "date_match": date_match,
                "order_id_match": order_id_match,
                "overall_match": overall_match,
                "expected_amount": float(amount),
                "expected_order_id": order_id
            })
        
        # Count successful matches
        successful_matches = [m for m in matches if m["overall_match"]]
        
        return jsonify({
            "status": "success",
            "search_criteria": {
                "order_id": order_id,
                "amount": amount,
                "today": today
            },
            "api_debug": api_debug_info,
            "total_transactions": len(transactions),
            "matches": matches,
            "successful_matches": len(successful_matches),
            "would_payment_succeed": len(successful_matches) > 0,
            "message": f"Found {len(successful_matches)} matching transactions (order_id + date match)"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"API call failed: {str(e)}",
            "token_last_4": token[-4:] if token else None
        }), 500

@debug_bp.route('/debug/check-recent-payments')
def check_recent_payments():
    """Check 5 recent transactions for order IDs"""
    
    token = os.getenv("SEPAY_AUTH_TOKEN")
    url = os.getenv("SEPAY_TRANSACTION_URL")
    
    if not token:
        return jsonify({
            "status": "error",
            "message": "SEPAY_AUTH_TOKEN not configured"
        }), 500
    
    # Get 5 recent transactions
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "limit": 5,
        "transaction_date_min": datetime.now().strftime("%Y-%m-%d")
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"API returned {response.status_code}",
                "response": response.text[:200]
            }), 500
            
        data = response.json()
        
        if not data.get("messages", {}).get("success"):
            return jsonify({
                "status": "error", 
                "message": "API call not successful",
                "data": data
            }), 500
            
        transactions = data.get("transactions", [])
        
        # Check each transaction for order IDs
        found_orders = []
        all_transactions = []
        
        for tx in transactions:
            content = tx.get("transaction_content", "")
            amount = tx.get("amount_in", "0")
            tx_date = tx.get("transaction_date", "")
            tx_id = tx.get("id", "")
            
            # Look for order patterns like O123456
            order_matches = re.findall(r'O\d+', content)
            
            tx_info = {
                "id": tx_id,
                "date": tx_date,
                "amount": amount,
                "content": content,
                "order_matches": order_matches
            }
            
            all_transactions.append(tx_info)
            
            if order_matches:
                found_orders.extend(order_matches)
        
        return jsonify({
            "status": "success",
            "total_transactions": len(transactions),
            "found_order_count": len(found_orders),
            "found_orders": list(set(found_orders)),  # Remove duplicates
            "all_transactions": all_transactions,
            "message": f"Found {len(set(found_orders))} unique orders in recent transactions"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"API call failed: {str(e)}",
            "token_last_4": token[-4:] if token else None
        }), 500

@debug_bp.route('/debug/trigger-payment-success/<order_id>')
def trigger_payment_success(order_id):
    """Manually trigger payment success for an order"""
    
    try:
        # Emit payment success event via WebSocket
        get_socketio().emit('payment_received', {
            'order_id': order_id,
            'transaction': {
                'transaction_content': f'Manual trigger for order {order_id}',
                'amount_in': '10000',
                'transaction_date': datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            'success': True,
            'message': f'Payment thành công cho đơn hàng {order_id}!'
        })
        
        # Set payment verified to True
        globals.set_payment_verified(True)
        globals.set_update_verified_quantity(True)
        
        return jsonify({
            'success': True,
            'message': f'Triggered payment success for order {order_id}',
            'order_id': order_id
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Failed to trigger payment: {str(e)}'
        }), 500

@debug_bp.route('/debug/auto-check-and-trigger-payment')
def auto_check_and_trigger_payment():
    """Auto-trigger payment for found orders"""
    
    token = os.getenv("SEPAY_AUTH_TOKEN")
    url = os.getenv("SEPAY_TRANSACTION_URL")
    
    if not token:
        return jsonify({
            "status": "error",
            "message": "SEPAY_AUTH_TOKEN not configured"
        }), 500
    
    # Get 10 recent transactions
    headers = {"Authorization": f"Bearer {token}"}
    params = {
        "limit": 10,
        "transaction_date_min": datetime.now().strftime("%Y-%m-%d")
    }
    
    try:
        response = requests.get(url, headers=headers, params=params, timeout=10)
        
        if response.status_code != 200:
            return jsonify({
                "status": "error",
                "message": f"API returned {response.status_code}",
                "response": response.text[:200]
            }), 500
            
        data = response.json()
        
        if not data.get("messages", {}).get("success"):
            return jsonify({
                "status": "error", 
                "message": "API call not successful",
                "data": data
            }), 500
            
        transactions = data.get("transactions", [])
        
        # Check each transaction for order IDs and auto-trigger
        triggered_orders = []
        
        for tx in transactions:
            content = tx.get("transaction_content", "")
            amount = tx.get("amount_in", "0")
            tx_date = tx.get("transaction_date", "")
            
            # Look for order patterns like O123456
            order_matches = re.findall(r'O\d+', content)
            
            for order_id in order_matches:
                if order_id not in triggered_orders:  # Avoid duplicate triggers
                    try:
                        # Trigger payment success for this order
                        get_socketio().emit('payment_received', {
                            'order_id': order_id,
                            'transaction': {
                                'transaction_content': content,
                                'amount_in': str(amount),
                                'transaction_date': tx_date,
                                'id': tx.get('id', '')
                            },
                            'success': True,
                            'message': f'Payment thành công cho đơn hàng {order_id}!'
                        })
                        
                        triggered_orders.append(order_id)
                        
                    except Exception as e:
                        print(f"Failed to trigger payment for {order_id}: {e}")
        
        return jsonify({
            "status": "success",
            "total_transactions_checked": len(transactions),
            "triggered_orders": triggered_orders,
            "triggered_count": len(triggered_orders),
            "message": f"Successfully triggered payment for {len(triggered_orders)} orders"
        })
        
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"API call failed: {str(e)}",
            "token_last_4": token[-4:] if token else None
        }), 500

@debug_bp.route('/debug/test_payment_success', methods=['POST'])
def test_payment_success():
    """Test endpoint to simulate payment success"""
    
    data = request.get_json() or {}
    order_id = data.get('orderId', 'TEST_ORDER')
    
    # Emit payment success event via WebSocket
    get_socketio().emit('payment_received', {
        'order_id': order_id,
        'transaction': {'transaction_content': f'Test payment for {order_id}'},
        'success': True,
        'message': 'Test payment thành công!'
    })
    
    return jsonify({
        'success': True,
        'message': f'Emitted payment success for order {order_id}'
    })

@debug_bp.route('/debug/test-taken-quantity')
def test_taken_quantity():
    """Test route to simulate taken quantity change for combo page redirect"""
    try:
        # Simulate taken quantity with some products taken
        test_taken_quantity = [0.0] * 15
        test_taken_quantity[0] = 1.0  # Simulate first product taken
        test_taken_quantity[5] = 2.0  # Simulate fifth product taken
        
        cart = get_cart()
        
        # Emit the loadcell update
        emit_loadcell_update(get_socketio(), test_taken_quantity, cart)
        
        return jsonify({
            'success': True,
            'message': 'Test taken quantity emitted',
            'taken_quantity': test_taken_quantity
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'message': f'Error: {str(e)}'
        })

@debug_bp.route('/api/all-products')
def mock_all_products():
    """Mock products for testing"""
    mock_products = []
    for i in range(15):
        mock_products.append({
            'product_id': f'P{i+1:03d}',
            'product_name': f'Sản phẩm {i+1}',
            'price': (i+1) * 5000,
            'max_quantity': 50,
            'img_url': '/static/img/no-image.jpg',
            'product_size': 'M',
            'product_color': 'Đỏ'
        })
    
    return jsonify(mock_products)