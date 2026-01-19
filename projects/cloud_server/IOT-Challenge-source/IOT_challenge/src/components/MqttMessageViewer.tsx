import React, { useEffect, useState } from "react";
import mqtt from "mqtt";
import { Paper, Typography, List, ListItem } from "@mui/material";

const MQTT_BROKER = "ws://broker.hivemq.com:8000/mqtt";
const TOPIC = "shelf/loadcell/quantity";

export default function MqttMessageViewer() {
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => {
    const client = mqtt.connect(MQTT_BROKER);

    client.on("connect", () => {
      client.subscribe(TOPIC);
    });

    client.on("message", (topic, payload) => {
      try {
        const msg = JSON.parse(payload.toString());
        setMessages((prev) => [
          { id: msg.id, values: msg.values, time: new Date().toLocaleTimeString() },
          ...prev,
        ]);
      } catch (e) {
        // Nếu không phải JSON thì hiển thị raw
        setMessages((prev) => [
          { id: "N/A", values: payload.toString(), time: new Date().toLocaleTimeString() },
          ...prev,
        ]);
      }
    });

    return () => {
      client.end();
    };
  }, []);

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6">MQTT Messages</Typography>
      <List>
        {messages.map((msg, idx) => (
          <ListItem key={idx} sx={{ display: "block" }}>
            <Typography variant="body2" color="text.secondary">
              [{msg.time}]
            </Typography>
            <Typography variant="body1">
              <b>ID:</b> {msg.id}
            </Typography>
            <Typography variant="body2">
              <b>Values:</b> {Array.isArray(msg.values) ? msg.values.join(", ") : msg.values}
            </Typography>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}