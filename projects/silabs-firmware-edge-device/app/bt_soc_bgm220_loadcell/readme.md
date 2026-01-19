
# BGM220 Loadcell BLE Project

## 📘 Description

This project performs the following tasks:
- Reads data from a loadcell sensor using the **HX711** module
- Processes and calibrates the data (scale and offset)
- Sends the data to a computer via **Bluetooth Low Energy (BLE)**
- Uses a **timer** to control periodic data reading

Meaning of notification sound:
 - One 100ms beep: Product quantity changed
 - One 500ms beep: Product on shelf wrong place
 - One 300ms beep: Devkit restart, config offset
 - Two 100 ms beeps spaced 500 ms apart: Config scale
 - Two 100 ms beeps spaced 200 ms apart: BLE Connection opened
 - Three 100 ms beeps spaced 200 ms apart: BLE Connection closed

The project is developed on the **Silicon Labs BGM220** platform using **C** with **Simplicity Studio**.

---

## 🧩 Project Structure

```
bt_soc_bgm220_loadcell/
│
├── app.c                // Main function to initialize BLE, read sensor, process data
├── hx711.c, hx711.h     // Interface for communicating with and reading from HX711
├── ble.c, ble.h         // Sends data via BLE Notify
├── timer_control.c, .h  // Sets up a timer to periodically read the sensor
├── gatt_db.h            // BLE GATT configuration (generated)
├── makefile             // Build configuration
└── README.md            // Project documentation
```

---

## 🔧 Software Dependencies

- **Simplicity Studio 5**
- **Silicon Labs Gecko SDK v3.x**
- Toolchain: **GNU ARM v12.x**
- BLE GATT Configurator (for generating `gatt_db.h`)
- Development board: **BGM220 Explorer Kit** or compatible

---

## 🔌 Hardware Requirements

- Microcontroller: **BGM220**
- Loadcell + **HX711** (force sensor module)
- 3.3V or 5V voltage regulator (if needed)
- Connecting wires, USB cable

---

## 🚀 Getting Started

1. **Connect the hardware**
   - Connect the loadcell to the HX711
   - Connect the HX711 to the BGM220 (DT and SCK pins accordingly)

2. **Install Simplicity Studio and open the project**

3. **Build and flash the firmware to the BGM220**

4. **Connect via BLE**
   - Use an app like **nRF Connect** or a custom mobile app to scan and receive BLE data from the device

---

## 🔁 Technical Notes

- Loadcell data is read periodically using `sl_sleeptimer`
- BLE uses a Custom Service and Notify to transmit the data
- Arrays `scale[]` and `offset[]` are used to convert raw values into accurate weight measurements

---

## 📞 Contact & Contributions

If you have any suggestions or contributions, feel free to create a pull request or contact via email:

📧 **duongkhang1676@gmail.com**

---

© 2025 – Developed by **Võ Dương Khang**
