import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

const getSocketUrl = () => {
    return localStorage.getItem('api_url') || 'http://localhost:3000';
};

export function SocketProvider({ children }: { children: ReactNode }) {
    const { token, user } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (token && user) {
            const socketUrl = getSocketUrl();
            console.log('[Socket] Connecting to:', socketUrl);

            const newSocket = io(socketUrl, {
                auth: { token },
                transports: ['websocket'], // Force WebSocket to avoid polling issues
                autoConnect: true,
            });

            newSocket.on('connect', () => {
                setIsConnected(true);
                console.log('Connected to WebSocket');
            });

            newSocket.on('disconnect', () => {
                setIsConnected(false);
                console.log('Disconnected from WebSocket');
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        } else {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
        }
    }, [token, user]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
}

export function useSocket() {
    const context = useContext(SocketContext);
    if (context === undefined) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
}
