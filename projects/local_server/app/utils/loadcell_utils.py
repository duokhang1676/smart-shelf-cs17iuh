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
Loadcell utility functions for error code handling and data processing
"""
from app.modules import globals


def check_loadcell_error_codes():
    """Check for error codes in loadcell_quantity and print appropriate messages"""
    snapshot = globals.get_loadcell_quantity_snapshot()
    for i, val in enumerate(snapshot):
        if val == 255:
            pass  # Loadcell error at position {i}
        elif val == 222:
            pass  # Product at position {i} not placed correctly
        elif val == 200:
            pass  # Product at position {i} not placed correctly


def get_error_messages():
    """Get list of error messages from current loadcell data"""
    error_messages = []
    snapshot = globals.get_loadcell_quantity_snapshot()
    for i, val in enumerate(snapshot):
        if val == 255:
            error_messages.append(f"Loadcell error at position {i}")
        elif val == 222:
            error_messages.append(f"Product at position {i} not placed correctly")
        elif val == 200:
            error_messages.append(f"Product at position {i} not placed correctly")
    return error_messages


def get_error_codes_info():
    """Get detailed error codes information"""
    error_codes = []
    snapshot = globals.get_loadcell_quantity_snapshot()
    for i, val in enumerate(snapshot):
        if val == 255:
            error_codes.append({
                'position': i,
                'code': 255,
                'message': f"Loadcell error at position {i}",
                'type': 'loadcell_error',
                'allow_manual_control': True
            })
        elif val == 222:
            error_codes.append({
                'position': i,
                'code': 222,
                'message': f"Product at position {i} not placed correctly",
                'type': 'placement_error',
                'allow_manual_control': False
            })
        elif val == 200:
            error_codes.append({
                'position': i,
                'code': 200,
                'message': f"Product at position {i} not placed correctly",
                'type': 'placement_error',
                'allow_manual_control': False
            })
    return error_codes


def has_real_data():
    """Check if we have real product data (not just error codes)"""
    snapshot = globals.get_loadcell_quantity_snapshot()
    return any(val > 0 and val not in [200, 222, 255] for val in snapshot)


def has_any_data():
    """Check if we have any data (including error codes)"""
    snapshot = globals.get_loadcell_quantity_snapshot()
    return any(val != 0 for val in snapshot)


def has_recent_data_reception():
    """Check if we have received data recently (within last 30 seconds)"""
    import time
    current_time = time.time()
    return (current_time - globals.last_data_reception_time) < 30


def process_loadcell_value(value):
    """Process a single loadcell value and return appropriate quantity"""
    if value == 255:
        return 0  # Loadcell error - treat as empty
    elif value == 222 or value == 200:
        return 0  # Placement error - treat as empty
    else:
        return value


def update_cart_quantities(cart, new_loadcell_data):
    """Update cart quantities based on loadcell data and return list of changes"""
    updated_products = []
    
    for idx, p in enumerate(cart):
        old_qty = p.get('qty', 0)
        if idx < len(new_loadcell_data):
            new_qty = process_loadcell_value(new_loadcell_data[idx])
            p['qty'] = new_qty
            
            if old_qty != p['qty']:
                updated_products.append(f"Index {idx}: {p['product_name'][:30]}... {old_qty}→{p['qty']}")
    
    return updated_products


def update_cart_with_combo_pricing(cart):
    """Apply combo pricing to cart and return updated cart with combo information"""
    try:
        from app.utils.database_utils import detect_and_apply_combo_pricing
        
        if not cart:
            return cart, []
        
        # Apply combo pricing logic
        updated_cart, applied_combos = detect_and_apply_combo_pricing(cart)
        
        # Log combo application for debugging
        if applied_combos:
            print(f"Applied {len(applied_combos)} combo(s) to cart:")
            for combo in applied_combos:
                combo_type = combo.get('combo_type', 'regular')
                if combo_type == 'buy_x_get_y':
                    print(f"  - {combo['combo_name']}: Buy {combo['buy_quantity']} get {combo['get_quantity']} free")
                    print(f"    Savings: {combo['savings']:,.0f}đ")
                else:
                    print(f"  - {combo['combo_name']}: {combo['savings']:,.0f}đ saved")
        
        return updated_cart, applied_combos
        
    except Exception as e:
        print(f"Error applying combo pricing: {e}")
        return cart, []
