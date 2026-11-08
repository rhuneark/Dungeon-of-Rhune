import type { ReactNode } from 'react';

export function Panel({
    title,
    onClose,
    children,
    className = '',
    style,
}: {
    title: string;
    onClose?: () => void;
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}) {
    return (
        <div className={`frame pe absolute flex flex-col p-[6px] ${className}`} style={style} onPointerDown={(e) => e.stopPropagation()}>
            <div className="relative mb-[4px] flex h-[20px] items-center justify-center border-b border-edge pb-[2px]">
                <span className="title18 text-gold">{title}</span>
                {onClose && (
                    <button className="pbtn absolute right-0 top-0 !px-[4px]" onClick={onClose} title="Close (Esc)">
                        x
                    </button>
                )}
            </div>
            {children}
        </div>
    );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="mb-[4px]">
            <div className="s8 mb-[2px] uppercase text-dim">{title}</div>
            {children}
        </div>
    );
}
