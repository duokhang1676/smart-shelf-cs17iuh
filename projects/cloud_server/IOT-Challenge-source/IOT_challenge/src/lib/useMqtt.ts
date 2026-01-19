import { useEffect, useRef, useState } from "react";
import createMqttClient from "./mqttClient";

type SensorData = {
  id?: string;
  humidity?: number | null;
  temperature?: number | null;
  light?: number | null;
  pressure?: number | null;
  [k: string]: any;
};

export function parsePayload(payload: string) {
  if (!payload) return null;
  // try normal JSON parse, fallback to replace Python's None and single quotes
  try {
    return JSON.parse(payload);
  } catch {
    try {
      const normalized = payload
        .replace(/\bNone\b/g, "null")
        .replace(/'/g, '"');
      return JSON.parse(normalized);
    } catch {
      // last resort: return raw string
      return payload;
    }
  }
}

export default function useMqtt(opts?: {
  host?: string;
  port?: number;
  path?: string;
  topics?: string[];
}) {
  const { host = "broker.hivemq.com", port = 8000, path = "/mqtt", topics = [] } = opts || {};
  const clientRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);

  const [sensor, setSensor] = useState<SensorData | null>(null);
  const [loadcellQuantities, setLoadcellQuantities] = useState<number[] | null>(null);
  const [tracking, setTracking] = useState<any | null>(null);
  const [status, setStatus] = useState<any | null>(null);

  useEffect(() => {
    clientRef.current = createMqttClient({
      host,
      port,
      path,
      topics,
      onConnect: () => setConnected(true),
      onFailure: () => setConnected(false),
      useSSL: false,
      onMessage: (topic: string, payload: string) => {
        const data = parsePayload(payload);

        if (topic.endsWith("/sensor/environment") || topic.includes("sensor")) {
          // sensor can be { id, humidity, temperature, light, pressure }
          if (typeof data === "object" && data !== null) {
            const parsedSensor: SensorData = {
              id: data.id ?? data.ID ?? data.Id,
              humidity: data.humidity == null ? null : Number(data.humidity),
              temperature: data.temperature == null ? null : Number(data.temperature),
              light: data.light == null ? null : Number(data.light),
              pressure: data.pressure == null ? null : Number(data.pressure),
              ...data,
            };
            setSensor(parsedSensor);
            try { localStorage.setItem("last_sensor", JSON.stringify(parsedSensor)); } catch {}
          } else {
            // If payload is simple array or string, store raw
            setSensor({ raw: data as any });
          }
        } else if (topic.endsWith("/loadcell/quantity") || topic.includes("loadcell")) {
          // payload may be { id, values: [...] } or { quantity: [...] } or plain array
          let arr: number[] | null = null;
          if (Array.isArray(data)) arr = data.map((n) => Number(n) || 0);
          else if (data && typeof data === "object") {
            const v = data.values ?? data.quantity ?? data.quantities ?? data.quantity_list;
            if (Array.isArray(v)) arr = v.map((n: any) => Number(n) || 0);
            else {
              // maybe object with numeric keys
              arr = Object.values(data).filter((x) => typeof x === "number").map((n) => Number(n));
            }
          } else if (typeof data === "string") {
            const parsedNums = String(data).split(/[,\s]+/).map((s) => Number(s)).filter((n) => !Number.isNaN(n));
            if (parsedNums.length) arr = parsedNums;
          }
          setLoadcellQuantities(arr);
          try { localStorage.setItem("realtime_quantity", JSON.stringify(arr)); } catch {}
        } else if (topic.includes("tracking") || topic.endsWith("/unpaid_customer")) {
          setTracking(data);
          try { localStorage.setItem("last_tracking", JSON.stringify(data)); } catch {}
        } else if (topic.includes("status") || topic.endsWith("/status/data")) {
          setStatus(data);
          try { localStorage.setItem("last_status", JSON.stringify(data)); } catch {}
        } else {
          // unknown topic: ignore or log
          // console.debug("MQTT unknown topic", topic, data);
        }
      },
    });

    // cleanup on unmount
    return () => {
      try {
        if (clientRef.current) clientRef.current.disconnect();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [host, port, path]);

  return {
    connected,
    sensor,
    loadcellQuantities,
    tracking,
    status,
    client: clientRef.current,
  };
}