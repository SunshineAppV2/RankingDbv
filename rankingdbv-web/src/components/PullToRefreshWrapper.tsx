import React from 'react';
import PullToRefresh from 'react-simple-pull-to-refresh';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface PullToRefreshWrapperProps {
    children: React.ReactNode;
    onRefresh?: () => Promise<any>;
}

export function PullToRefreshWrapper({ children, onRefresh }: PullToRefreshWrapperProps) {
    const queryClient = useQueryClient();

    const handleRefresh = async () => {
        try {
            // If custom refresh provided, use it
            if (onRefresh) {
                await onRefresh();
            } else {
                // Default: Invalidate all queries to refresh data
                await queryClient.invalidateQueries();
                await queryClient.refetchQueries();
            }
        } catch (error) {
            console.error("Refresh failed", error);
        }
    };

    return (
        <PullToRefresh
            onRefresh={handleRefresh}
            pullingContent={
                <div className="flex items-center justify-center p-4 text-blue-500">
                    <span className="text-sm font-medium">Puxe para atualizar...</span>
                </div>
            }
            refreshingContent={
                <div className="flex items-center justify-center p-4 text-blue-500 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm font-medium">Atualizando...</span>
                </div>
            }
        >
            <div className="min-h-screen">
                {children}
            </div>
        </PullToRefresh>
    );
}
