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
Status management utility functions
"""


def get_status_message(status):
    """Get user-friendly status message"""
    if status == "disconnected":
        return "System starting up..."
    elif status == "connecting":
        return "Connecting to loadcell..."
    elif status == "connected":
        return "Connected successfully! Ready to use."
    else:
        return "Checking connection..."


def update_connection_status(status, connected_flag=None):
    """Update connection status and return new values"""
    if status == "connected":
        return status, True
    elif status in ["connecting", "disconnected", "error"]:
        return status, False
    else:
        return status, connected_flag if connected_flag is not None else False
