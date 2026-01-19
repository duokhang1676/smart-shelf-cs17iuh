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
import app.modules.globals as globals

def update_verified_quantity():
    """Update verified quantity with loadcell quantity."""
    globals.set_update_verified_quantity(True)
    globals.set_is_tracking(False)
    globals.set_verified_quantity(globals.get_loadcell_quantity_snapshot())
    # Save the verified quantity to the json file