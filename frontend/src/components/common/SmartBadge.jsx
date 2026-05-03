import React from 'react';

const SmartBadge = ({ score, reason }) => {
    if (score === undefined || score === null) return null;

    let badgeClass = 'bg-red-50 text-red-900 border-red-200';
    let fillClass = 'bg-gradient-to-r from-red-200 to-red-300';
    if (score >= 80) {
        badgeClass = 'bg-green-50 text-green-900 border-green-300';
        fillClass = 'bg-gradient-to-r from-green-700 via-green-500 to-green-700 bg-[length:200%_100%] animate-ai-shimmer';
    } else if (score >= 50) {
        badgeClass = 'bg-slate-50 text-slate-900 border-slate-200';
        fillClass = 'bg-gradient-to-r from-green-200 to-green-300';
    }

    return (
        <div className="flex flex-col gap-3 mb-4">
            <div 
                className={`relative flex items-center py-1.5 px-2.5 rounded-md text-xs w-full overflow-hidden border ${badgeClass} cursor-default`} 
                title={reason ? `${score}% Match - ${reason}` : `${score}% Match`}
            >
                <div className={`absolute top-0 left-0 h-full z-0 transition-[width] duration-1000 ease-out ${fillClass}`} style={{ width: `${score}%` }}></div>
                <div className="relative z-10 flex items-center w-full whitespace-nowrap">
                    <span className="mr-1.5 text-sm shrink-0">✨</span>
                    <span className="mr-1.5 tracking-wider font-bold shrink-0">{score}% MATCH</span>
                    {reason && <span className="font-normal opacity-85 truncate">• {reason}</span>}
                </div>
            </div>
        </div>
    );
};

export default SmartBadge;
