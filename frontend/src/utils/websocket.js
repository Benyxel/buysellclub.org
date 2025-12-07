/**
 * WebSocket utility for real-time live chat
 */

const resolveWebSocketUrl = () => {
  const baseUrl = import.meta.env?.VITE_API_BASE_URL || "";
  const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  
  if (baseUrl && !baseUrl.startsWith("http")) {
    // Relative path - use current host
    const host = window.location.host;
    return `${wsProtocol}//${host}/ws/live-chat/`;
  }
  
  if (baseUrl) {
    // Absolute URL - convert to WebSocket URL
    const url = new URL(baseUrl);
    return `${wsProtocol}//${url.host}/ws/live-chat/`;
  }
  
  // Default to current host
  const host = window.location.host;
  return `${wsProtocol}//${host}/ws/live-chat/`;
};

export class LiveChatWebSocket {
  constructor(onMessage, onUnreadCount, onError, onOpen, onClose, onTyping) {
    this.onMessage = onMessage;
    this.onUnreadCount = onUnreadCount;
    this.onError = onError;
    this.onOpen = onOpen;
    this.onClose = onClose;
    this.onTyping = onTyping;
    this.ws = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.shouldReconnect = true;
    this.pingInterval = null;
  }

  connect() {
    const token = localStorage.getItem("token") || localStorage.getItem("adminToken");
    if (!token) {
      console.error("No authentication token found");
      if (this.onError) this.onError(new Error("No authentication token"));
      return;
    }

    const wsUrl = `${resolveWebSocketUrl()}?token=${encodeURIComponent(token)}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("WebSocket connected");
        this.reconnectAttempts = 0;
        if (this.onOpen) this.onOpen();
        
        // Start ping interval to keep connection alive
        this.pingInterval = setInterval(() => {
          if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: "ping" }));
          }
        }, 30000); // Ping every 30 seconds
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "pong") {
            // Pong response, connection is alive
            return;
          }
          
          if (data.type === "chat_message" && this.onMessage) {
            this.onMessage(data.message);
          } else if (data.type === "unread_count_update" && this.onUnreadCount) {
            this.onUnreadCount(data.count);
          } else if (data.type === "typing" && this.onTyping) {
            this.onTyping(data);
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        if (this.onError) this.onError(error);
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket closed", event.code, event.reason);
        if (this.pingInterval) {
          clearInterval(this.pingInterval);
          this.pingInterval = null;
        }
        
        if (this.onClose) this.onClose(event);
        
        // Attempt to reconnect if not a normal closure
        if (this.shouldReconnect && event.code !== 1000) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
      if (this.onError) this.onError(error);
      this.attemptReconnect();
    }
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      if (this.onError) {
        this.onError(new Error("Failed to reconnect after multiple attempts"));
      }
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
    if (this.ws) {
      this.ws.close(1000, "Client disconnect");
      this.ws = null;
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn("WebSocket is not open");
    }
  }
}

