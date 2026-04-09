import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const [onlineDoctors, setOnlineDoctors] = useState([]);

  useEffect(() => {
    if (!user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
      return;
    }

    const s = io('http://localhost:4000', { transports: ['websocket'] });
    socketRef.current = s;
    setSocket(s);

    s.on('connect', () => {
      console.log('[WS] Connected:', s.id);
      s.emit('identify', {
        userId: user.id,
        role: user.role,
        profileId: user.profile?.id,
      });
    });

    s.on('online_doctors', (ids) => {
      setOnlineDoctors(ids);
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
      setSocket(null);
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, onlineDoctors }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
