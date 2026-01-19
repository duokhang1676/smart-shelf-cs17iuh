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
Main routes - Main page and basic routes
"""
from flask import Blueprint, render_template

from app.utils.database_utils import load_products_from_json, load_combos_from_json

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def slideshow_default():
    """Default page - slideshow with combo images"""
    combos = load_combos_from_json()
    return render_template('slideshow.html', combos=combos)

@main_bp.route('/cart')
def cart_main():
    products = load_products_from_json()
    return render_template('cart.html', products=products)

@main_bp.route('/shelf')
def shelf_page():
    """Display shelf page with 3-tier 15-slot layout"""
    products = load_products_from_json()
    return render_template('shelf.html', products=products)

@main_bp.route('/slideshow')
def slideshow_page():
    """Display slideshow page with combo images"""
    combos = load_combos_from_json()
    return render_template('slideshow.html', combos=combos)

@main_bp.route('/guide')
def shelf_guide():
    """Display shelf usage guide page"""
    return render_template('guide.html')

@main_bp.route('/sensor-data')
def sensor_data_page():
    """Sensor data monitoring page - displays real-time sensor values from globals"""
    return render_template('setting.html')

@main_bp.route('/mobile-app')
def mobile_app_page():
    """Mobile app connection page - shows mobile app interface"""
    return render_template('setting.html')

@main_bp.route('/connection-test')
def connection_test():
    """Debug page for testing connection status"""
    return render_template('connection_test.html')

@main_bp.route('/payment_success')
def payment_success():
    return render_template('payment_success.html')

@main_bp.route('/payment_fail')
def payment_fail():
    return render_template('payment_fail.html')

@main_bp.route('/combo')
def combo_page():
    """Display combo products page"""
    return render_template('combo.html')
