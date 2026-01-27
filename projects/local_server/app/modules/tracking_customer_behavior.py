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
from ultralytics import YOLO
import cv2
import numpy as np
from app.modules import globals
import time
import os
import threading
from app.utils.sound_utils import play_sound
from app.modules.cloud_sync import post_order_data_to_cloud

def start_tracking_customer_behavior():
    customer_frame = None
    sound_file_path_1 = os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/camera-connected.mp3"))
    sound_file_path_2 = os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/init-model-success.mp3"))
    sound_file_path_3 = os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/unpaid_warning.mp3"))
    sound_file_path_4 = os.path.abspath(os.path.join(__file__, "../../..", "app/static/sounds/warning-2.mp3"))
    frame_file_path = os.path.abspath(os.path.join(__file__, "../../..", "app/static/img/customer_frame/frame.jpg"))
    frame_box_file_path = os.path.abspath(os.path.join(__file__, "../../..", "app/static/img/customer_frame/frame_box.jpg"))
    frame_crop_file_path = os.path.abspath(os.path.join(__file__, "../../..", "app/static/img/customer_frame"))
    
    roi_x1, roi_y1 = 50, 0
    roi_x2, roi_y2 = 366, 640
    ################# PC config #################
    # model_file_path = os.path.abspath(os.path.join(__file__, "../../..", "app/modules/detector/models/yolo11n-person-416-ver2.pt"))
    # model = YOLO(model_file_path)
    # model.overrides['verbose'] = False
    # cap = cv2.VideoCapture(0)
    # cap.set(cv2.CAP_PROP_FRAME_WIDTH, 416)
    # cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 416)

    ################# Jetson nano config #################
    model_file_path = os.path.abspath(os.path.join(__file__, "../../..", "app/modules/detector/models/yolo11n-person-416-ver2.engine"))
    model = YOLO(model_file_path)
    model.overrides['verbose'] = False
    # gst_pipeline = (
    #         "nvarguscamerasrc ! "
    #         "video/x-raw(memory:NVMM), width=416, height=416, framerate=30/1 ! "
    #         "nvvidconv ! "
    #         "video/x-raw, format=BGRx ! "
    #         "videoconvert ! "
    #         "video/x-raw, format=BGR ! appsink"
    #     )
    # cap = cv2.VideoCapture(gst_pipeline, cv2.CAP_GSTREAMER)
    ########################################################
    cap = cv2.VideoCapture("/dev/video0")  # for Jetson Nano with USB camera
    if not cap.isOpened():
        print("Error: Could not open camera.")
        exit()

    ret, frame = cap.read()
    if ret:
        # init the model (load weights)
        model(frame)
        # threading.Thread(target=play_sound, args=(sound_file_path_2,)).start()

    alert = 0
    while True:
        if not globals.get_is_tracking():
            # temporary
            alert = 0
            customer_frame = None

            time.sleep(1)
            continue
        
        time.sleep(0.05)  # Add a small delay to reduce CPU usage
        ret, frame = cap.read()
        # frame = cv2.resize(frame, (416, 416))

        if not ret:
            print("Error: Can't read frame!")
            continue
    
        results = model(frame)

        person_detected = False

        for result in results:
            boxes = result.boxes
            for box in boxes:
                cls = int(box.cls[0].cpu().numpy())
                conf = float(box.conf[0])
                if conf > 0.5 and cls == 0:  
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2

                    # Check if person is in ROI
                    if roi_x1 <= cx <= roi_x2 and roi_y1 <= cy <= roi_y2:
                        person_detected = True
                        alert = 0
                        print(f"[IN ROI] Person detected at ({int(cx)}, {int(cy)})")

                        if customer_frame is None:
                            customer_frame = frame.copy()
                            customer_frame_box = frame.copy()

                            label = "Customer"
                            x1, y1, x2, y2 = map(int, [x1, y1, x2, y2])
                            cv2.rectangle(customer_frame_box, (x1, y1), (x2, y2), (0, 255, 0), 2)              
                            cv2.putText(customer_frame_box, label, (x1, y1 - 10),
                                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

                            obj = customer_frame_box[y1:y2, x1:x2]
                            cv2.imwrite(f"{frame_crop_file_path}/Customer.jpg", obj)
                            cv2.imwrite(frame_file_path, customer_frame)
                            cv2.imwrite(frame_box_file_path, customer_frame_box)
                        break  # Only process first person in ROI
                    else:
                        print(f"[OUTSIDE ROI] Person detected at ({int(cx)}, {int(cy)})")
            
            if person_detected:
                break  # Exit outer loop if person already detected


        if not person_detected:
            print("⚠️  Warning: No person detected.")
            alert += 1
            if alert == 20:
                threading.Thread(target=play_sound, args=(sound_file_path_3,)).start()
            if alert == 60:
                threading.Thread(target=play_sound, args=(sound_file_path_3,)).start()
            if alert == 100:
                threading.Thread(target=play_sound, args=(sound_file_path_4,)).start()
                globals.set_unpaid_customer_warning(True)

                # post order data with unpaid status
                order_id = str("HD"+str(int(time.time() * 1000)))
                shelf_id = os.getenv("SHELF_ID_CLOUD")

                order_details = []
                total_bill = 0

                for p, qty in zip(globals.get_products_data(), globals.get_taken_quantity()):
                    if qty > 0:
                        total_price = qty * p.get("price", 0)
                        order_details.append({
                            "product_id": p.get("product_id", p.get("_id", "")),
                            "quantity": qty,
                            "price": p.get("price", 0),
                            "total_price": total_price
                        })
                        total_bill += total_price

                order_data = {
                    'status': 'unpaid',
                    'order_code': order_id,
                    'shelf_id': shelf_id,
                    'total_bill': total_bill,
                    'orderDetails': order_details
                }     
                post_order_data_to_cloud(order_data)

                alert = 0
                customer_frame = None
  
                globals.set_is_tracking(False)
                globals.set_payment_verified(True)

        # cv2.imshow("Detection", frame)
        
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()