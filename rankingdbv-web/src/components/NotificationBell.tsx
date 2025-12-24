import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { Modal } from './Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';

interface Notification {
    id: string;
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    read: boolean;
    createdAt: string;
}

export function NotificationBell() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const queryClient = useQueryClient();
    const { socket } = useSocket();

    // Listen for real-time notifications
    useEffect(() => {
        if (!socket) return;

        socket.on('notification', (newNotification) => {
            console.log('Real-time notification received:', newNotification);
            // Invalidate query to refetch the list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });

            // Optional: Show a toast or play a sound
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(newNotification.title, { body: newNotification.message });
            }
        });

        return () => {
            socket.off('notification');
        };
    }, [socket, queryClient]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [dropdownRef]);

    const { data: notifications = [] } = useQuery<Notification[]>({
        queryKey: ['notifications'],
        queryFn: async () => {
            const response = await api.get('/notifications');
            return response.data;
        }
        // Removed refetchInterval since we have sockets now
    });

    const unreadCount = notifications.filter(n => !n.read).length;

    const readMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.patch(`/notifications/${id}/read`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    const markAllReadMutation = useMutation({
        mutationFn: async () => {
            return api.patch('/notifications/read-all');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
    });

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors"
            >
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
            </button>

            {/* Modal for Notifications */}
            <Modal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                title="Notificações"
                maxWidth="max-w-md"
            >
                <div>
                    {unreadCount > 0 && (
                        <div className="flex justify-end mb-2">
                            <button
                                onClick={() => {
                                    markAllReadMutation.mutate();
                                    setIsOpen(false);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Marcar todas como lidas
                            </button>
                        </div>
                    )}

                    <div className="space-y-2">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-slate-500 text-sm">
                                Nenhuma notificação.
                            </div>
                        ) : (
                            notifications.map(notification => (
                                <div
                                    key={notification.id}
                                    className={`p-4 border rounded-lg transition-colors cursor-pointer ${!notification.read ? 'bg-blue-50/50 border-blue-100' : 'bg-white border-slate-100'}`}
                                    onClick={() => {
                                        if (!notification.read) readMutation.mutate(notification.id);

                                        // Deep Linking Logic
                                        if (notification.title === 'Nova Aprovação Pendente') {
                                            navigate('/dashboard/members?action=approvals');
                                        }

                                        // Always close on click as requested
                                        setIsOpen(false);
                                    }}
                                >
                                    <div className="flex gap-3">
                                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.type === 'SUCCESS' ? 'bg-green-500' :
                                            notification.type === 'WARNING' ? 'bg-yellow-500' :
                                                notification.type === 'ERROR' ? 'bg-red-500' : 'bg-blue-500'
                                            }`} />
                                        <div>
                                            <p className={`text-sm ${!notification.read ? 'font-semibold text-slate-800' : 'text-slate-600'}`}>
                                                {notification.title}
                                            </p>
                                            <p className="text-xs text-slate-500 mt-1">
                                                {notification.message}
                                            </p>
                                            <span className="text-[10px] text-slate-400 mt-2 block">
                                                {new Date(notification.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
}
