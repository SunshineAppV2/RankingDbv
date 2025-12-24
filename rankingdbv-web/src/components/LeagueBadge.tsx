import { Shield, Award, Crown, Gem } from 'lucide-react';
import { getLeague, type League } from '../utils/leagues';

export function LeagueBadge({ points, size = 'md' }: { points: number; size?: 'sm' | 'md' | 'lg' }) {
    const league = getLeague(points);

    const getIcon = (name: League) => {
        switch (name) {
            case 'FERRO': return Shield;
            case 'BRONZE': return Shield;
            case 'PRATA': return Award;
            case 'OURO': return Crown;
            case 'DIAMANTE': return Gem;
            default: return Shield;
        }
    };

    const Icon = getIcon(league.name);

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5 gap-1',
        md: 'text-xs px-2.5 py-1 gap-1.5',
        lg: 'text-sm px-3 py-1.5 gap-2'
    };

    const iconSizes = {
        sm: 'w-3 h-3',
        md: 'w-4 h-4',
        lg: 'w-5 h-5'
    };

    return (
        <div
            className={`inline-flex items-center font-bold rounded-full ${league.bg} ${league.color} ${sizeClasses[size]}`}
            title={`Liga ${league.name} - ${league.description}`}
        >
            <Icon className={`${iconSizes[size]}`} />
            <span>{league.name}</span>
        </div>
    );
}
