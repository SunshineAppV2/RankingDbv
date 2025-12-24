import { useState, useRef, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import { HelpModal } from './HelpModal';

export function HelpButton() {
    const [isOpen, setIsOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(true);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const buttonRef = useRef<HTMLButtonElement>(null);
    const isDragging = useRef(false);
    const startPos = useRef({ x: 0, y: 0 });

    useEffect(() => {
        // Initial position (bottom-right)
        // We'll let CSS handle the initial position and only apply transform if moved
    }, []);

    const handleTouchStart = (e: React.TouchEvent) => {
        isDragging.current = true;
        const touch = e.touches[0];
        startPos.current = {
            x: touch.clientX - position.x,
            y: touch.clientY - position.y
        };
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging.current) return;
        const touch = e.touches[0];
        const newX = touch.clientX - startPos.current.x;
        const newY = touch.clientY - startPos.current.y;
        setPosition({ x: newX, y: newY });
    };

    const handleTouchEnd = () => {
        isDragging.current = false;
    };

    if (!isVisible) return null;

    return (
        <>
            <div
                className="fixed z-50 transition-transform duration-75"
                style={{
                    // Use fixed positioning but valid for CSS bottom/right
                    bottom: '24px',
                    right: '24px',
                    transform: `translate(${position.x}px, ${position.y}px)`,
                    touchAction: 'none' // Important for drag
                }}
            >
                {/* Close Button (Little 'x' above) */}
                <button
                    onClick={() => setIsVisible(false)}
                    className="absolute -top-2 -right-2 bg-slate-200 text-slate-600 rounded-full p-1 opacity-60 hover:opacity-100 shadow-sm z-50"
                >
                    <X className="w-3 h-3" />
                </button>

                <button
                    ref={buttonRef}
                    onClick={() => {
                        // Prevent click if we just dragged
                        if (Math.abs(position.x) > 5 || Math.abs(position.y) > 5) return;
                        setIsOpen(true);
                    }}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors group cursor-grab active:cursor-grabbing"
                    title="Ajuda / FAQ"
                >
                    <HelpCircle className="w-6 h-6" />
                </button>
            </div>

            <HelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
        </>
    );
}
