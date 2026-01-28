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
# from gtts import gTTS
# import vlc
# import os

# def speech_text(text):
#     path = os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/temp.mp3"))
#     tts = gTTS(text=text, lang='vi', slow=False)
#     tts.save(path)
#     player = vlc.MediaPlayer(path)
#     player.play()

# def play_sound(path):
#     player = vlc.MediaPlayer(path)
#     player.play()

from gtts import gTTS
import subprocess
import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
SOUND_PATH = os.path.join(BASE_DIR, "app/static/sounds/temp.mp3")

def speech_text(text):
    tts = gTTS(text=text, lang='vi', slow=False)
    tts.save(SOUND_PATH)

    subprocess.run(
        ["mpg123", "-q", "-a", "hw:Device,0", SOUND_PATH],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )

def play_sound(path):
    print(f"DEBUG play_sound: Attempting to play: {path}")
    print(f"DEBUG play_sound: File exists: {os.path.exists(path)}")
    
    try:
        # Try with timeout to prevent blocking
        result = subprocess.run(
            ["mpg123", "-q", "-a", "hw:Device,0", path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            timeout=10  # 10 second timeout
        )
        
        if result.returncode != 0:
            print(f"DEBUG play_sound ERROR: Return code: {result.returncode}")
            print(f"DEBUG play_sound ERROR: stdout: {result.stdout}")
            print(f"DEBUG play_sound ERROR: stderr: {result.stderr}")
        else:
            print(f"DEBUG play_sound: Sound played successfully")
    except subprocess.TimeoutExpired:
        print(f"DEBUG play_sound ERROR: Command timed out after 10 seconds")
        print(f"DEBUG play_sound: Trying without audio device specification...")
        
        # Fallback: try without specific audio device
        try:
            result = subprocess.run(
                ["mpg123", "-q", path],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                print(f"DEBUG play_sound: Sound played successfully (without device spec)")
            else:
                print(f"DEBUG play_sound ERROR: Fallback failed - {result.stderr}")
        except Exception as e:
            print(f"DEBUG play_sound ERROR: Fallback exception - {e}")
    except FileNotFoundError:
        print(f"DEBUG play_sound ERROR: mpg123 command not found")
    except Exception as e:
        print(f"DEBUG play_sound ERROR: Unexpected exception - {e}")
