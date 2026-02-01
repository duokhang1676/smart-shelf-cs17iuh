import mqtt, { MqttClient } from "mqtt";

type MqttOptions = {
  host: string;
  port?: number;
  path?: string;
  clientId?: string;
  useSSL?: boolean;
  topics?: string[];
  onMessage?: (topic: string, payload: string) => void;
  onConnect?: () => void;
  onFailure?: (err: any) => void;
};

export function createMqttClient(opts: MqttOptions) {
  const {
    host,
    port = 8000,
    path = "/mqtt",
    clientId = "webclient-" + Math.random().toString(16).substr(2, 8),
    useSSL = true,
    topics = [],
    onMessage,
    onConnect,
    onFailure,
  } = opts;

  // Construct WebSocket URL with proper protocol (wss for secure)
  const protocol = useSSL ? "wss" : "ws";
  const brokerUrl = `${protocol}://${host}:${port}${path}`;

  let connected = false;
  let client: MqttClient;

  try {
    client = mqtt.connect(brokerUrl, {
      clientId,
      reconnectPeriod: 2000,
      clean: true,
    });

    client.on("connect", () => {
      connected = true;
      console.log("MQTT connected");
      if (onConnect) onConnect();
      
      // Subscribe to initial topics
      topics.forEach((topic) => {
        client.subscribe(topic, (err) => {
          if (err) {
            console.warn("Subscribe failed:", err);
          }
        });
      });
    });

    client.on("message", (topic: string, payload: Buffer) => {
      try {
        const payloadString = payload.toString();
        if (onMessage) onMessage(topic, payloadString);
      } catch (e) {
        console.error("Error parsing MQTT message", e);
      }
    });

    client.on("error", (err) => {
      connected = false;
      console.warn("MQTT error:", err);
      if (onFailure) onFailure(err);
    });

    client.on("close", () => {
      connected = false;
      console.warn("MQTT connection closed");
    });

    client.on("offline", () => {
      connected = false;
      console.warn("MQTT offline");
    });

  } catch (err) {
    console.error("Failed to create MQTT client:", err);
    if (onFailure) onFailure(err);
  }

  return {
    isConnected: () => connected,
    subscribe: (topic: string) => {
      if (!client) return;
      client.subscribe(topic, (err) => {
        if (err) {
          console.warn("Subscribe error", err);
        }
      });
    },
    unsubscribe: (topic: string) => {
      if (!client) return;
      client.unsubscribe(topic, (err) => {
        if (err) {
          console.warn("Unsubscribe error", err);
        }
      });
    },
    disconnect: () => {
      if (client) {
        client.end();
        connected = false;
      }
    },
    rawClient: client,
  };
}

export default createMqttClient;