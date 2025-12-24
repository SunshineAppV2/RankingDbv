
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    isWithinInterval,
    startOfDay,
    endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    startDate: string;
    endDate: string;
    cost: number;
    description?: string;
    location?: string;
    registrations?: any[];
}

interface EventCalendarProps {
    events: Event[];
    onDayClick: (date: Date, events: Event[]) => void;
    currentDate: Date;
    onNavigate: (date: Date) => void;
}

export function EventCalendar({ events, onDayClick, currentDate, onNavigate }: EventCalendarProps) {
    // const [currentDate, setCurrentDate] = useState(new Date()); // Removed internal state

    const startDate = startOfWeek(startOfMonth(currentDate));
    const endDate = endOfWeek(endOfMonth(currentDate));

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate
    });

    const nextMonth = () => onNavigate(addMonths(currentDate, 1));
    const prevMonth = () => onNavigate(subMonths(currentDate, 1));
    const goToToday = () => onNavigate(new Date());

    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventStart = startOfDay(new Date(event.startDate));
            const eventEnd = endOfDay(new Date(event.endDate || event.startDate));
            const targetDay = startOfDay(day);

            return isWithinInterval(targetDay, { start: eventStart, end: eventEnd });
        });
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-blue-600" />
                    <h2 className="font-bold text-slate-800 capitalize">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>
                </div>
                <div className="flex gap-1">
                    <button onClick={prevMonth} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button onClick={goToToday} className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors">
                        Hoje
                    </button>
                    <button onClick={nextMonth} className="p-1 hover:bg-slate-200 rounded text-slate-600 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 text-center text-xs font-semibold text-slate-400 py-2 border-b border-slate-100 bg-slate-50/50">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            <div className="grid grid-cols-7 text-sm">
                {days.map((day, idx) => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDayClick(day, dayEvents)}
                            className={`
                                aspect-square p-1 border-b border-r border-slate-50 transition-colors relative group cursor-pointer flex flex-col items-center justify-center gap-0.5
                                ${!isCurrentMonth ? 'bg-slate-50/50 text-slate-300' : 'text-slate-700 hover:bg-blue-50/30'}
                                ${idx % 7 === 0 ? 'border-l' : ''}
                            `}
                        >
                            <span className={`
                                w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium
                                ${isToday ? 'bg-blue-600 text-white shadow-sm' : ''}
                                ${dayEvents.length > 0 && !isToday ? 'font-bold text-blue-600' : ''}
                            `}>
                                {format(day, 'd')}
                            </span>

                            {/* Event Indicators (Tiny Dots) */}
                            <div className="flex gap-0.5 h-1.5 align-start">
                                {dayEvents.slice(0, 3).map(event => (
                                    <div
                                        key={event.id}
                                        className={`w-1 h-1 rounded-full ${isSameDay(new Date(event.startDate), day) ? 'bg-blue-500' : 'bg-blue-300 opacity-50'}`}
                                        title={`${event.title}`}
                                    />
                                ))}
                                {dayEvents.length > 3 && <div className="w-1 h-1 rounded-full bg-slate-300" />}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
