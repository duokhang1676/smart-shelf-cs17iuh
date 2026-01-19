import { Client, Message } from "paho-mqtt";

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
    useSSL = false,
    topics = [],
    onMessage,
    onConnect,
    onFailure,
  } = opts;

  const client = new Client(host, port, path, clientId);
  let connected = false;
  let reconnectTimer: NodeJS.Timeout | null = null;

  client.onConnectionLost = (responseObject) => {
    connected = false;
    // try reconnect after a delay
    if (responseObject?.errorCode !== 0) {
      console.warn("MQTT connection lost:", responseObject.errorMessage);
    }
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        tryConnect();
      }, 2000);
    }
  };

  client.onMessageArrived = (message: Message) => {
    try {
      const payload = message.payloadString;
      if (onMessage) onMessage(message.destinationName, payload);
    } catch (e) {
      console.error("Error parsing MQTT message", e);
    }
  };

  function tryConnect() {
    client.connect({
      onSuccess: () => {
        connected = true;
        if (onConnect) onConnect();
        // subscribe to initial topics
        topics.forEach((t) => {
          try {
            client.subscribe(t);
          } catch (e) {
            console.warn("Subscribe failed:", e);
          }
        });
      },
      useSSL,
      onFailure: (err) => {
        connected = false;
        console.warn("MQTT connect failure", err);
        if (onFailure) onFailure(err);
        // schedule reconnect
        if (!reconnectTimer) {
          reconnectTimer = setTimeout(() => {
            reconnectTimer = null;
            tryConnect();
          }, 3000);
        }
      },
    });
  }

  // initial connect
  tryConnect();

  return {
    isConnected: () => connected,
    subscribe: (topic: string) => {
      if (!connected) return;
      try {
        client.subscribe(topic);
      } catch (e) {
        console.warn("Subscribe error", e);
      }
    },
    unsubscribe: (topic: string) => {
      if (!connected) return;
      try {
        client.unsubscribe(topic);
      } catch (e) {
        console.warn("Unsubscribe error", e);
      }
    },
    disconnect: () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      try {
        if (client.isConnected()) client.disconnect();
      } catch (e) {
        // ignore
      }
      connected = false;
    },
    rawClient: client,
  };
}

export default createMqttClient;