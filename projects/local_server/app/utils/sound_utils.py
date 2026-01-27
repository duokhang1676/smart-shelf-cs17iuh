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
    subprocess.run(
        ["mpg123", "-q", "-a", "hw:Device,0", path],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL
    )
