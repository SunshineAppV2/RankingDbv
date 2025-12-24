export type League = 'FERRO' | 'BRONZE' | 'PRATA' | 'OURO' | 'DIAMANTE';

interface LeagueInfo {
    name: League;
    min: number;
    color: string;
    bg: string;
    description: string;
}

export const LEAGUES: LeagueInfo[] = [
    { name: 'FERRO', min: 0, color: 'text-slate-600', bg: 'bg-slate-200', description: 'Início da jornada' },
    { name: 'BRONZE', min: 1000, color: 'text-orange-700', bg: 'bg-orange-200', description: 'Guerreiro em ascensão' },
    { name: 'PRATA', min: 3000, color: 'text-slate-400', bg: 'bg-slate-100', description: 'Brilho da determinação' },
    { name: 'OURO', min: 6000, color: 'text-yellow-600', bg: 'bg-yellow-100', description: 'Excelência dourada' },
    { name: 'DIAMANTE', min: 10000, color: 'text-cyan-600', bg: 'bg-cyan-100', description: 'Lenda do clube' },
];

export function getLeague(points: number): LeagueInfo {
    // Reverse sort to find the highest matching threshold
    const league = [...LEAGUES].reverse().find(l => points >= l.min);
    return league || LEAGUES[0]; // Default to Ferro
}
