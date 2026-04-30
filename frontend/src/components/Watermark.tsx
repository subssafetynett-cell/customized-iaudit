import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { X } from 'lucide-react';
import botLogo from '../assets/bot-logo.svg';

const Watermark: React.FC = () => {
    // We'll track position from bottom-right as (x, y) offset
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    // Window dimensions for smart positioning
    const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });

    // Track if it's a drag or just a click
    const dragHasMoved = useRef(false);
    const dragStartPos = useRef({ x: 0, y: 0 });
    const location = useLocation();

    useEffect(() => {
        const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Hide watermark on authentication pages
    const isAuthPage = ['/login', '/signup', '/auth'].includes(location.pathname);
    if (isAuthPage) return null;

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(true);
        dragHasMoved.current = false;
        dragStartPos.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!isDragging) return;
        dragHasMoved.current = true;

        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        // If the user didn't move the pointer, toggle the chatbot open state
        if (!dragHasMoved.current) {
            setIsOpen(prev => !prev);
        }
    };

    // Calculate smart positioning for the chatbot window
    // Base position is bottom: 24px, right: 24px but modified by position.x and position.y
    const actualRight = 24 - position.x;
    const actualBottom = 24 - position.y;

    const isPastMidX = actualRight > (windowSize.width / 2);
    const isPastMidY = actualBottom > (windowSize.height / 2);

    // Determine the classes to apply based on what quadrant of the screen the widget is in
    const windowVerticalClass = isPastMidY ? "top-full mt-2" : "bottom-[110%]";
    const windowHorizontalClass = isPastMidX ? "left-0" : "right-0";

    return (
        <div
            className={`fixed bottom-6 right-6 z-[100] transition-transform duration-75 ${isDragging ? 'scale-105' : 'hover:scale-105'}`}
            style={{
                transform: `translate(${position.x}px, ${position.y}px)`,
            }}
        >
            {/* Chatbot Window */}
            {isOpen && (
                <div className={`absolute ${windowVerticalClass} ${windowHorizontalClass} w-[350px] sm:w-[400px] h-[550px] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col z-[101]`}>
                    <div className="bg-[#1e293b] text-white p-3 flex justify-between items-center rounded-t-2xl">
                        <span className="font-semibold px-2">AuditMate AI Assistant</span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                            }}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors outline-none"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <iframe
                        src="https://auditmate.iaudit.global/"
                        className="w-full h-full border-none flex-1"
                        title="AuditMate Chatbot"
                    />
                </div>
            )}

            {/* Draggable Logo Button - adding group for hover state targeting */}
            <div
                className={`group touch-none select-none outline-none focus:outline-none ${isDragging ? 'cursor-grabbing' : 'cursor-pointer'}`}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                style={{ WebkitTapHighlightColor: 'transparent' }}
                tabIndex={-1}
            >
                {/* Friendly Hover Tooltip (hides when dragging or when chat open) 
                    Uses group-hover to show when hovering the wrapper div */}
                {!isDragging && !isOpen && (
                    <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 w-max px-4 py-2 bg-[#1e293b] text-white text-sm font-medium rounded-2xl shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-300 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-[6px] after:border-transparent after:border-t-[#1e293b]">
                        Hi, I am AuditMate 👋
                    </div>
                )}

                {/* Just the plain bot logo without any animated borders or extra backgrounds */}
                <img
                    src={botLogo}
                    alt="Bot Logo Watermark"
                    className="w-16 h-16 object-contain pointer-events-none mix-blend-multiply outline-none"
                    draggable={false}
                />
            </div>
        </div>
    );
};

export default Watermark;
