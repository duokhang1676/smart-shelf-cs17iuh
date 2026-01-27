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
import os
from datetime import datetime

import requests
from dotenv import load_dotenv
from app.modules import globals

load_dotenv()

# Create a session for connection reuse and faster requests
session = requests.Session()
session.headers.update({"Accept": "application/json", "Content-Type": "application/json"})

class VietQRPaymentAPI:
    @staticmethod
    def generate_qr(amount, order_id=None):
        add_info = f"Pay for snack machine {order_id}" if order_id else "Pay for snack machine"
        sepay_config = globals.sepay_info
        payload = {
            "accountNo": sepay_config.get("VIETQR_ACCOUNT_NO", ""),
            "accountName": sepay_config.get("VIETQR_ACCOUNT_NAME", ""),
            "acqId": sepay_config.get("VIETQR_ACQ_ID", ""),
            "addInfo": add_info,
            "amount": amount,
            "template": "compact"
        }
        # Use session for connection reuse and reduce timeout for faster response
        response = session.post(os.getenv("VIETQR_PAYMENT_URL"), json=payload, timeout=5)
        response.raise_for_status()
        return response.json()

    @staticmethod
    def check_sepay_payment(token=None, bank_account_id=None, amount=None, add_info=None, order_id=None, days=1):
        # Load from globals if not provided
        sepay_config = globals.sepay_info
        if token is None:
            token = sepay_config.get("SEPAY_AUTH_TOKEN", "")
        if bank_account_id is None:
            bank_account_id = sepay_config.get("SEPAY_BANK_ACCOUNT_ID", "")
        
        SEPAY_TRANSACTION_URL = os.getenv("SEPAY_TRANSACTION_URL")
        today = datetime.now().strftime("%Y-%m-%d")
        
        params = {
            "transaction_date_min": today,
            "limit": 5
        }
        
        # Don't add account_number filter to get all transactions
        # if bank_account_id:
        #     params["account_number"] = bank_account_id
        
        headers = {
            "Authorization": f"Bearer {token}"
        }
        
        try:
            response = requests.get(SEPAY_TRANSACTION_URL, headers=headers, params=params, timeout=5)
            if response.status_code == 401:
                return "unauthorized", None
            response.raise_for_status()
            data = response.json()
            
            if data.get("messages", {}).get("success") is True:
                transactions = data.get("transactions", [])
                for tx in transactions:
                    content = tx.get("transaction_content", "")
                    tx_date = tx.get("transaction_date", "")
                    tx_amount = float(tx.get("amount_in", 0))
                    
                    # Check if the transaction content contains order_id and is from today
                    if order_id and order_id in content and tx_date.startswith(today):
                        return True, tx
                                
            return False, None
            
        except Exception as e:
            return False, None

    @staticmethod
    def get_transaction_detail(token, transaction_id):
        base_url = os.getenv("SEPAY_TRANSACTION_DETAIL_URL")
        url = f"{base_url}/{transaction_id}"
        headers = {"Authorization": f"Bearer {token}"}
        try:
            response = requests.get(url, headers=headers, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get("status") == 200:
                return data.get("transaction")
        except Exception as e:
            pass
        return None
