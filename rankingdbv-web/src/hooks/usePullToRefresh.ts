
import { useEffect, useState } from 'react';
import type { RefObject } from 'react';

export function usePullToRefresh(scrollRef: RefObject<HTMLElement>, onRefresh: () => void) {
    const [startY, setStartY] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);
    const THRESHOLD = 150;

    useEffect(() => {
        const element = scrollRef.current;
        if (!element) return;

        const handleTouchStart = (e: TouchEvent) => {
            // Only enable pull if we are at the top of the container
            if (element.scrollTop === 0) {
                setStartY(e.touches[0].clientY);
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            const currentY = e.touches[0].clientY;
            const distance = currentY - startY;

            // Only allow pulling if we started at top and are pulling down
            if (startY > 0 && distance > 0 && element.scrollTop === 0) {
                // Add resistance
                const resistedDistance = distance * 0.5;

                if (e.cancelable) e.preventDefault();
                setPullDistance(resistedDistance);
            }
        };

        const handleTouchEnd = () => {
            if (pullDistance > THRESHOLD) {
                onRefresh();
            }
            setPullDistance(0);
            setStartY(0);
        };

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
        };
    }, [startY, pullDistance, onRefresh, scrollRef]);

    return { pullDistance };
}
