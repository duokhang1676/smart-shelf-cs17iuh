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
import threading
import numpy as np
import os
from app.utils.file_utils import read_file
from app.modules.cloud_sync import load_rfids_from_cloud, load_combo_from_cloud, load_posters_from_cloud
from app.utils.string_utils import remove_accents

# Define loadcell configuration
LOADCELL_NUM_1 = 8
LOADCELL_NUM_2 = 7
LOADCELL_NUM_TOTAL = LOADCELL_NUM_1 + LOADCELL_NUM_2

# Functions to extract product attributes
def load_weight_of_one(products_data):
    return [int(p["weight"] / 3) for p in products_data]

def load_products_price(products_data):
    return [int(p["price"] / 1000) for p in products_data]

def load_products_name(products_data):
    products_name = [
        remove_accents(p["product_name"])[:16] 
        for p in products_data
    ]
    return products_name

def load_products_name_decimal(products_name):
    products_name_bytes = [name.encode("utf-8") for name in products_name]
    joined_bytes = b";".join(products_name_bytes)
    products_name_decimal = list(joined_bytes) # Convert bytes to list of integers
    products_name_split = [chr(b) for b in joined_bytes]
    semicolon_count = 0
    products_name_char_count = 0 # count characters until LOADCELL_NUM_1 semicolons
    for ch in products_name_split:
        products_name_char_count += 1
        if ch == ";":
            semicolon_count += 1
            if semicolon_count == LOADCELL_NUM_1:
                break
    return products_name_decimal, products_name_char_count

bgm_220_1_connection = False
bgm_220_2_connection = False

#rfids = ["0001529685"] # List of valid RFID tags
# load rfids from json file
rfids_path = os.path.abspath(os.path.join(__file__, "../../..", "database/rfids.json"))
rfids = read_file(rfids_path) # List of valid RFID tags

rfid_state = 0 # 0 is added, 1 is adding
bool_rfid_devices = False
bool_rfid = False
rfid = ""

# When payment is verified, update verified quantity is set to True
update_verified_quantity = False
payment_verified = False
is_tracking = False
print_bill = False


quantity_change_flag = False
# Load data from json file
loadcell_file_path = os.path.abspath(os.path.join(__file__, "../../..", "database/loadcell.json"))
verified_quantity_data = read_file(loadcell_file_path)

verified_quantity = np.array(verified_quantity_data["values"])
loadcell_quantity = np.array(verified_quantity_data["values"])
taken_quantity = np.zeros(LOADCELL_NUM_TOTAL)

# Load products infomation from json file
product_path = os.path.abspath(os.path.join(__file__, "../../..", "database/products.json"))
products_data = read_file(product_path)
weight_of_one = load_weight_of_one(products_data)
products_price = load_products_price(products_data)
products_name = load_products_name(products_data)
products_name_decimal, products_name_char_count = load_products_name_decimal(products_name)

voice_command = None

threatshold_imu_lean = 50
threatshold_imu_shake = 90
imu_data_init = None
shelf_lean = False
shelf_shake = False
unpaid_customer_warning = False
pressure = None
temperature = None
humidity = None
light = None
sound = None
magnetic = None

# Thread lock for loadcell data access
quantity_change_flag_lock = threading.Lock()
loadcell_lock = threading.Lock()
verified_quantity_lock = threading.Lock()
taken_quantity_lock = threading.Lock()
is_tracking_lock = threading.Lock()
payment_verified_lock = threading.Lock()
update_verified_quantity_lock = threading.Lock()
voice_command_lock = threading.Lock()
print_bill_lock = threading.Lock()
rfid_lock = threading.Lock()
products_lock = threading.Lock()
products_weight_lock = threading.Lock()
products_price_lock = threading.Lock()
products_name_lock = threading.Lock()
products_name_decimal_lock = threading.Lock()
products_name_char_count_lock = threading.Lock()
rfids_lock = threading.Lock()
imu_data_init_lock = threading.Lock()
threatshold_imu_lean_lock = threading.Lock()
threatshold_imu_shake_lock = threading.Lock()
pressure_lock = threading.Lock()
temperature_lock = threading.Lock()
humidity_lock = threading.Lock()
light_lock = threading.Lock()
sound_lock = threading.Lock()
magnetic_lock = threading.Lock()
shelf_lean_lock = threading.Lock()
shelf_shake_lock = threading.Lock()
unpaid_customer_warning_lock = threading.Lock()

# Last data reception timestamp for connection tracking
last_data_reception_time = 0

# Thread-safe access to global variables
def get_voice_command():
    with voice_command_lock:
        return voice_command
    
def set_voice_command(new_command):
    with voice_command_lock:
        global voice_command
        voice_command = new_command

def get_quantity_change_flag():
    """Get a thread-safe snapshot of quantity change flag"""
    with quantity_change_flag_lock:
        return quantity_change_flag

def set_quantity_change_flag(new_state):
    """Set quantity change flag in a thread-safe way"""
    with quantity_change_flag_lock:
        global quantity_change_flag
        quantity_change_flag = new_state

def get_taken_quantity():
    """Get a thread-safe snapshot of taken quantity"""
    with taken_quantity_lock:
        return [int(x) for x in taken_quantity.copy()]

def set_taken_quantity(new_data):
    """Set taken quantity in a thread-safe way"""
    with taken_quantity_lock:
        global taken_quantity
        if isinstance(new_data, list):
            taken_quantity[:len(new_data)] = new_data
        else:
            taken_quantity = np.array([int(x) for x in new_data])

def reset_taken_quantity():
    """Set taken quantity in a thread-safe way"""
    with taken_quantity_lock:
        global taken_quantity
        new_data = np.zeros(LOADCELL_NUM_TOTAL)
        if isinstance(new_data, list):
            taken_quantity[:len(new_data)] = new_data
        else:
            taken_quantity = list(new_data)    

def get_is_tracking():
    """Get a thread-safe snapshot of is_tracking state"""
    with is_tracking_lock:
        return is_tracking
    
def set_is_tracking(new_state):
    """Set is_tracking state in a thread-safe way"""
    with is_tracking_lock:
        global is_tracking
        is_tracking = new_state

def get_verified_quantity():
    """Get a thread-safe snapshot of verified quantity"""
    with verified_quantity_lock:
        return [int(x) for x in verified_quantity.copy()]

def set_verified_quantity(new_data):
    """Set verified quantity in a thread-safe way"""
    with verified_quantity_lock:
        global verified_quantity
        if isinstance(new_data, list):
            verified_quantity[:len(new_data)] = new_data
        else:
            verified_quantity = np.array([int(x) for x in new_data])

def get_loadcell_quantity_snapshot():
    """Get a thread-safe snapshot of loadcell quantity"""
    with loadcell_lock:
        return [int(x) for x in loadcell_quantity.copy()]

def set_loadcell_quantity(new_data):
    """Set loadcell quantity in a thread-safe way"""
    with loadcell_lock:
        global loadcell_quantity
        if isinstance(new_data, list):
            loadcell_quantity[:len(new_data)] = new_data
        else:
            loadcell_quantity = np.array([int(x) for x in new_data])

def get_payment_verified():
    """Get a thread-safe snapshot of payment verified state"""
    with payment_verified_lock:
        return payment_verified

def set_payment_verified(new_state):
    """Set payment verified state in a thread-safe way"""
    with payment_verified_lock:
        global payment_verified
        payment_verified = new_state

def get_update_verified_quantity():
    """Get a thread-safe snapshot of update verified quantity state"""
    with update_verified_quantity_lock:
        return update_verified_quantity

def set_update_verified_quantity(new_state):
    """Set update verified quantity state in a thread-safe way"""
    with update_verified_quantity_lock:
        global update_verified_quantity
        update_verified_quantity = new_state

def get_print_bill():
    """Get a thread-safe snapshot of print bill state"""
    with print_bill_lock:
        return print_bill

def set_print_bill(new_state):
    """Set print bill state in a thread-safe way"""
    with print_bill_lock:
        global print_bill
        print_bill = new_state

def get_bool_rfid_devices():
    """Get a thread-safe snapshot of bool_rfid_devices state"""
    with rfid_lock:
        return bool_rfid_devices

def set_bool_rfid_devices(new_state):
    """Set bool_rfid_devices state in a thread-safe way"""
    with rfid_lock:
        global bool_rfid_devices
        bool_rfid_devices = new_state

def get_rfid_state():
    """Get a thread-safe snapshot of rfid_state"""
    with rfid_lock:
        return rfid_state

def set_rfid_state(new_state):
    """Set rfid_state in a thread-safe way"""
    with rfid_lock:
        global rfid_state
        rfid_state = new_state

def get_products_data():
    """Get a thread-safe snapshot of products data"""
    with products_lock:
        return products_data

def set_products_data(new_data):
    """Set products data in a thread-safe way"""
    with products_lock:
        global products_data
        products_data = new_data

def get_products_weight():
    """Get a thread-safe snapshot of products weight"""
    with products_weight_lock:
        return weight_of_one

def set_products_weight(new_weight):
    """Set products weight in a thread-safe way"""
    with products_weight_lock:
        global weight_of_one
        weight_of_one = new_weight

def get_products_price():
    """Get a thread-safe snapshot of products price"""
    with products_price_lock:
        return products_price.copy()

def set_products_price(new_price):
    """Set products price in a thread-safe way"""
    with products_price_lock:
        global products_price
        products_price = new_price

def get_products_name():
    """Get a thread-safe snapshot of products name"""
    with products_name_lock:
        return products_name.copy()

def set_products_name(new_name):
    """Set products name in a thread-safe way"""
    with products_name_lock:
        global products_name
        products_name = new_name

def get_products_name_decimal():
    """Get a thread-safe snapshot of products name decimal"""
    with products_name_decimal_lock:
        return products_name_decimal.copy()

def set_products_name_decimal(new_name_decimal):
    """Set products name decimal in a thread-safe way"""
    with products_name_decimal_lock:
        global products_name_decimal
        products_name_decimal = new_name_decimal

def get_products_name_char_count():
    """Get a thread-safe snapshot of products name character count"""
    with products_name_char_count_lock:
        return products_name_char_count.copy()

def set_products_name_char_count(new_char_count):
    """Set products name character count in a thread-safe way"""
    with products_name_char_count_lock:
        global products_name_char_count
        products_name_char_count = new_char_count

def get_rfids():
    """Get a thread-safe snapshot of rfids"""
    with rfid_lock:
        return rfids.copy()

def set_rfids(new_rfids):
    """Set rfids in a thread-safe way"""
    with rfid_lock:
        global rfids
        rfids = new_rfids

def get_imu_data_init():
    """Get a thread-safe snapshot of imu data"""
    with imu_data_init_lock:
        return imu_data_init

def set_imu_data_init(new_data):
    """Set imu data in a thread-safe way"""
    with imu_data_init_lock:
        global imu_data_init
        imu_data_init = new_data

def get_threatshold_imu_lean():
    """Get a thread-safe snapshot of threatshold_imu_lean"""
    with threatshold_imu_lean_lock:
        return threatshold_imu_lean
    
def set_threatshold_imu_lean(new_threatshold):
    """Set threatshold_imu_lean in a thread-safe way"""
    with threatshold_imu_lean_lock:
        global threatshold_imu_lean
        threatshold_imu_lean = new_threatshold

def get_threatshold_imu_shake():
    """Get a thread-safe snapshot of threatshold_imu_shake"""
    with threatshold_imu_shake_lock:
        return threatshold_imu_shake

def set_threatshold_imu_shake(new_threatshold):
    """Set threatshold_imu_shake in a thread-safe way"""
    with threatshold_imu_shake_lock:
        global threatshold_imu_shake
        threatshold_imu_shake = new_threatshold

def get_pressure():
    """Get a thread-safe snapshot of pressure"""
    with pressure_lock:
        return pressure

def set_pressure(new_pressure):
    """Set pressure in a thread-safe way"""
    with pressure_lock:
        global pressure
        pressure = new_pressure

def get_temperature():
    """Get a thread-safe snapshot of temperature"""
    with temperature_lock:
        return temperature

def set_temperature(new_temperature):
    """Set temperature in a thread-safe way"""
    with temperature_lock:
        global temperature
        temperature = new_temperature

def get_humidity():
    """Get a thread-safe snapshot of humidity"""
    with humidity_lock:
        return humidity

def set_humidity(new_humidity):
    """Set humidity in a thread-safe way"""
    with humidity_lock:
        global humidity
        humidity = new_humidity

def get_light():
    """Get a thread-safe snapshot of light"""
    with light_lock:
        return light

def set_light(new_light):
    """Set light in a thread-safe way"""
    with light_lock:
        global light
        light = new_light

def get_sound():
    """Get a thread-safe snapshot of sound"""
    with sound_lock:
        return sound
    
def set_sound(new_sound):
    """Set sound in a thread-safe way"""
    with sound_lock:
        global sound
        sound = new_sound

def get_magnetic():
    """Get a thread-safe snapshot of magnetic"""
    with magnetic_lock:
        return magnetic
    
def set_magnetic(new_magnetic):
    """Set magnetic in a thread-safe way"""
    with magnetic_lock:
        global magnetic
        magnetic = new_magnetic

def get_shelf_lean():
    """Get a thread-safe snapshot of shelf_lean"""
    with shelf_lean_lock:
        return shelf_lean

def set_shelf_lean(new_shelf_lean):
    """Set shelf_lean in a thread-safe way"""
    with shelf_lean_lock:
        global shelf_lean
        shelf_lean = new_shelf_lean
    
def get_shelf_shake():
    """Get a thread-safe snapshot of shelf_shake"""
    with shelf_shake_lock:
        return shelf_shake  
    
def set_shelf_shake(new_shelf_shake):
    """Set shelf_shake in a thread-safe way"""
    with shelf_shake_lock:
        global shelf_shake
        shelf_shake = new_shelf_shake

def get_unpaid_customer_warning():
    """Get a thread-safe snapshot of unpaid_customer_warning"""
    with unpaid_customer_warning_lock:
        return unpaid_customer_warning

def set_unpaid_customer_warning(new_warning):
    """Set unpaid_customer_warning in a thread-safe way"""
    with unpaid_customer_warning_lock:
        global unpaid_customer_warning
        unpaid_customer_warning = new_warning



# Load data from cloud (non-blocking, falls back to local data)
try:
    load_rfids_from_cloud()
except Exception as e:
    print(f"Could not load RFIDs from cloud: {e}. Using local data.")

try:
    load_posters_from_cloud()
except Exception as e:
    print(f"Could not load posters from cloud: {e}. Using local data.")

try:
    load_combo_from_cloud()
except Exception as e:
    print(f"Could not load combos from cloud: {e}. Using local data.")