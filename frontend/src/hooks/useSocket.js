import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export default function useSocket(token) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) return;
    // Create socket connection only once
    if (!socketRef.current) {
      socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
      });
    }
    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [token]);

  return socketRef;
} 