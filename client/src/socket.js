import { io } from 'socket.io-client';

let socket = null;

export function getSocket(token) {
  if (!socket || !socket.connected) {
    socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
