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
import json

def read_file(file_path):
    with open(file_path, 'r', encoding="utf-8") as file:
        return json.load(file)

def write_file(file_path, data):
    with open(file_path, 'w', encoding="utf-8") as file:
        json.dump(data, file, indent=4)