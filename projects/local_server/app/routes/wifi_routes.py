'''
* Copyright 2025 Vo Duong Khang [C]
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
from flask import Blueprint, jsonify, request, render_template
from app.modules import wifi_manager
import logging

logger = logging.getLogger(__name__)

wifi_bp = Blueprint('wifi', __name__)

@wifi_bp.route('/wifi-setup')
def wifi_setup_page():
    """Trang setup WiFi"""
    return render_template('wifi_setup.html')

@wifi_bp.route('/api/wifi/status', methods=['GET'])
def get_wifi_status():
    """API lấy trạng thái WiFi hiện tại"""
    try:
        status = wifi_manager.get_wifi_status()
        return jsonify({
            'success': True,
            'data': status
        })
    except Exception as e:
        logger.error(f"Error getting WiFi status: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@wifi_bp.route('/api/wifi/scan', methods=['GET'])
def scan_wifi():
    """API quét các mạng WiFi khả dụng"""
    try:
        networks = wifi_manager.scan_wifi_networks()
        return jsonify({
            'success': True,
            'data': networks
        })
    except Exception as e:
        logger.error(f"Error scanning WiFi: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@wifi_bp.route('/api/wifi/connect', methods=['POST'])
def connect_wifi():
    """API kết nối tới mạng WiFi"""
    try:
        data = request.get_json()
        
        if not data or 'ssid' not in data:
            return jsonify({
                'success': False,
                'error': 'SSID is required'
            }), 400
        
        ssid = data['ssid']
        password = data.get('password', None)
        
        success, message = wifi_manager.connect_to_wifi(ssid, password)
        
        return jsonify({
            'success': success,
            'message': message
        })
    except Exception as e:
        logger.error(f"Error connecting to WiFi: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@wifi_bp.route('/api/wifi/hotspot/info', methods=['GET'])
def get_hotspot_info():
    """API lấy thông tin hotspot"""
    return jsonify({
        'success': True,
        'data': {
            'ssid': wifi_manager.HOTSPOT_SSID,
            'password': wifi_manager.HOTSPOT_PASSWORD
        }
    })
