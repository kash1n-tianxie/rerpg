import React from 'react';

export interface FloatingTextData {
    id: string;
    value: number;
    type: 'damage' | 'heal' | 'shield';
    targetId: string;
}

interface Props {
    texts: FloatingTextData[];
}

const FloatingText: React.FC<Props> = ({ texts }) => {
    const getPosition = (targetId: string) => {
        const element = document.getElementById(targetId);
        if (!element) return { top: 0, left: 0 };
        const rect = element.getBoundingClientRect();
        return {
            top: rect.top + rect.height / 2 - 10,
            left: rect.left + rect.width / 2 - 20,
        };
    };

    return (
        <>
            {texts.map(text => {
                const pos = getPosition(text.targetId);
                return (
                    <div
                        key={text.id}
                        className={`floating-text floating-${text.type}`}
                        style={{
                            top: `${pos.top}px`,
                            left: `${pos.left}px`,
                        }}
                    >
                        {text.type === 'damage' ? `-${text.value}` : `+${text.value}`}
                    </div>
                );
            })}
        </>
    );
};

export default FloatingText;
