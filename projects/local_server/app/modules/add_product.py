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
import os
import threading
import numpy as np
from datetime import datetime
from app.utils.file_utils import write_file
from app.modules.cloud_sync import post_history_added_products_to_cloud, load_products_from_cloud, load_rfids_from_cloud, load_posters_from_cloud, load_combo_from_cloud
from app.utils.sound_utils import play_sound
from app.modules import globals
from dotenv import load_dotenv

def adding_product():
    globals.set_rfid_state(1)
    threading.Thread(target=play_sound, args=(os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/adding-item.mp3")),)).start()
    print("Load data from cloud")
    try:
        load_products_from_cloud()
        load_rfids_from_cloud()
        load_combo_from_cloud()
        load_posters_from_cloud()
    except Exception as e:
        print(f"Error loading data from cloud: {e}")

    globals.bool_rfid_devices = True 
    globals.bool_rfid = True

def added_product():
    load_dotenv()
    pre_product_ids = [item["product_id"] for item in globals.get_products_data()]
    pre_verified_quantity = globals.get_verified_quantity()
    
    # added product event
    globals.set_rfid_state(0)  # Set RFID state back to 0 (added/idle)
    threading.Thread(target=play_sound, args=(os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/added-item.mp3")),)).start()
    print("Save verified quantity to file")
    verified_quantity = globals.get_verified_quantity()
    loadcell_quantity = globals.get_loadcell_quantity_snapshot()
    for i, q in enumerate(loadcell_quantity):
        if q < 200:
            verified_quantity[i] = q
    globals.set_verified_quantity(verified_quantity)
    verified_quantity_data = {
        "name": "verified_quantity",
        "values": verified_quantity
    }
    if isinstance(verified_quantity_data["values"], np.ndarray):
        verified_quantity_data["values"] = verified_quantity_data["values"].tolist()
    loadcell_file_path = os.path.abspath(os.path.join(__file__, "../../..", "database/loadcell.json"))
    write_file(loadcell_file_path, verified_quantity_data)
    # Post added product data to cloud
    added_products_data = {
        "shelf": os.getenv("SHELF_ID_CLOUD"),
        "user_rfid": globals.rfid,
        "pre_products": pre_product_ids,
        "post_products": [item["product_id"] for item in globals.get_products_data()],
        "pre_verified_quantity": pre_verified_quantity,
        "post_verified_quantity": verified_quantity,
    }
    pre_product_ids = [item["product_id"] for item in globals.get_products_data()]
    pre_verified_quantity = verified_quantity
    try:
        post_history_added_products_to_cloud(added_products_data)
    except Exception as e:
        print(f"Error posting history added data to cloud: {e}")

    globals.bool_rfid_devices = True 
    globals.bool_rfid = True