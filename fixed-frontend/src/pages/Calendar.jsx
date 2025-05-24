import { useState, useEffect } from 'react';
import DashboardHeader from '../components/DashboardHeader';
import dayjs from 'dayjs';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { fetchCurrentUser } from '../utils/fetchCurrentUser';
const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
    const [view, setView] = useState('MONTH');
    const [current, setCurrent] = useState(dayjs());
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [appointments, setAppointments] = useState([]);
    const [dayTask, setDayTask] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editIndex, setEditIndex] = useState(null);
    const [color, setColor] = useState('bg-blue-100');


    // Load tasks on mount
    useEffect(() => {
        const loadCalendar = async () => {
            const user = await fetchCurrentUser();
            if (!user) return;

            try {
                const res = await fetch('http://localhost:4000/api/calendar/load', {
                    method: 'GET',
                    credentials: 'include',
                });
                const data = await res.json();
                if (data.success) setAppointments(data.tasks || []);
            } catch (err) {
                console.error('Failed to load calendar:', err);
            }
        };
        loadCalendar();
    }, []);

    // Save tasks
    const saveCalendar = async (updatedTasks) => {
        setAppointments(updatedTasks);
        await fetch('http://localhost:4000/api/calendar/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ tasks: updatedTasks }),
        });


    };

    const goToPrev = () => setCurrent(prev => prev.subtract(1, view.toLowerCase()));
    const goToNext = () => setCurrent(prev => prev.add(1, view.toLowerCase()));
    const handleDayClick = (date) => {
        setSelectedDate(date);
        setView('DAY');
    };

    const renderMonthSidebar = () => {
        return [0, 1, 2].map(offset => {
            const month = current.add(offset, 'month');
            const startDay = month.startOf('month').day();
            const daysInMonth = month.daysInMonth();
            const todayStr = dayjs().format('YYYY-MM-DD');

            return (
                <div key={offset}>
                    <div className="text-sm font-semibold mb-2">{month.format('MMMM YYYY')}</div>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs mb-4">
                        {daysOfWeek.map(d => <div key={d} className="font-bold">{d.slice(0, 2)}</div>)}
                        {Array.from({ length: startDay }).map((_, i) => <div key={i}></div>)}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const date = month.date(i + 1);
                            const isToday = date.format('YYYY-MM-DD') === todayStr;
                            return (
                                <div
                                    key={i}
                                    onClick={() => handleDayClick(date)}
                                    className={`py-1 rounded cursor-pointer ${isToday ? 'bg-forest text-white font-bold' : 'hover:bg-forest hover:text-white'}`}
                                >
                                    {i + 1}
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        });
    };

    const renderMonth = () => {
        const start = current.startOf('month');
        const end = current.endOf('month');
        const daysInMonth = end.date();
        const startWeekday = start.day();
        const cells = [];

        for (let i = 0; i < startWeekday; i++) cells.push(null);
        for (let i = 1; i <= daysInMonth; i++) cells.push(start.date(i));

        return (
            <div className="grid grid-cols-7 gap-2 text-sm">
                {cells.map((date, i) => {
                    const formatted = date?.format('YYYY-MM-DD');
                    const isToday = formatted === dayjs().format('YYYY-MM-DD');
                    return (
                        <div
                            key={i}
                            className={`min-h-[100px] border rounded bg-cream p-2 cursor-pointer 
    ${isToday ? 'ring-2 ring-forest ' : ''}`
                            }
                            onClick={() => date && handleDayClick(date)}
                        >
                            <div className="text-xs text-gray-500 mb-1">{date ? date.date() : ''}</div>
                            {appointments
                                .filter(app => app.date === formatted)
                                .map((app, idx) => (
                                    <div key={idx} className={`prose prose-sm text-xs p-1 rounded ${app.color}`} dangerouslySetInnerHTML={{ __html: app.title }}
                                    ></div>

                                ))}
                        </div>
                    );
                })
                }
            </div >
        );
    };

    const renderWeek = () => {
        const start = current.startOf('week');
        const days = Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));

        return (
            <div className="grid grid-cols-7 gap-2 text-sm">
                {days.map((date, i) => {
                    const formatted = date.format('YYYY-MM-DD');
                    const isToday = formatted === dayjs().format('YYYY-MM-DD');

                    return (
                        <div
                            key={i}
                            onClick={() => handleDayClick(date)}
                            className={`min-h-[200px] border rounded p-2 bg-cream cursor-pointer transition 
    ${isToday ? 'ring-2 ring-forest' : ''}`}
                        >

                            <div className="font-semibold text-xs">{daysOfWeek[i]}</div>
                            <div className="text-xs text-gray-500">{date.format('MMM D')}</div>
                            {appointments
                                .filter(app => app.date === formatted)
                                .map((app, idx) => (
                                    <div key={idx} className={`prose prose-sm text-xs p-1 rounded mt-1 ${app.color}`} dangerouslySetInnerHTML={{ __html: app.title }}
                                    ></div>

                                ))}
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDay = () => {
        const dateStr = selectedDate.format('YYYY-MM-DD');
        const tasks = appointments.filter(app => app.date === dateStr);

        const saveTask = () => {
            if (!dayTask.trim()) return;
            let updated = [...appointments];
            if (editIndex !== null) {
                updated[editIndex] = { ...updated[editIndex], title: dayTask, color };
                setEditIndex(null);
            } else {
                updated.push({ date: dateStr, time: 'Custom', title: dayTask, color });
            }
            setDayTask('');
            setIsEditing(false);
            saveCalendar(updated);
        };

        const handleDelete = (index) => {
            const updated = appointments.filter((_, i) => i !== index);
            saveCalendar(updated);
        };

        const handleEdit = (index) => {
            const app = appointments[index];
            setEditIndex(index);
            setDayTask(app.title);
            setColor(app.color);
            setIsEditing(true);
        };

        return (
            <div className="bg-cream p-4 border rounded min-h-[300px]">
                <div className="font-semibold mb-4 text-lg">{selectedDate.format('dddd, MMMM D, YYYY')}</div>
                {tasks.map((app, i) => (
                    <div key={i} className={`text-sm p-3 mb-3 rounded ${app.color} relative`}>
                        <div className="font-medium mb-1">{app.time}</div>
                        <div className="prose prose-sm " dangerouslySetInnerHTML={{ __html: app.title }} />
                        <div className="absolute top-1 right-2 space-x-2">
                            <button onClick={() => handleEdit(i)} className="text-xs text-blue-700 underline">Edit</button>
                            <button onClick={() => handleDelete(i)} className="text-xs text-red-700 underline">Delete</button>
                        </div>
                    </div>
                ))}
                {isEditing ? (
                    <div className="mt-4">
                        <div className="mb-2 space-x-2">
                            {['⭐', '✅', '❌', '🗑️', '🧹', '🍳', '🌱', '💧'].map((emoji) => (
                                <button
                                    key={emoji}
                                    onClick={() => setDayTask(dayTask + ' ' + emoji)}
                                    className="text-lg"
                                    title={`Insert ${emoji}`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                        <ReactQuill
                            value={dayTask}
                            onChange={setDayTask}
                            placeholder="Write your task..."
                            modules={{
                                toolbar: [
                                    [{ header: [1, 2, false] }],
                                    ['bold', 'italic', 'underline'],
                                    [{ color: [] }, { background: [] }],
                                    [{ list: 'ordered' }, { list: 'bullet' }],
                                    ['clean'],
                                ],
                            }}
                            formats={[
                                'header', 'bold', 'italic', 'underline',
                                'color', 'background', 'list', 'bullet'
                            ]}
                            className="bg-cream rounded border mb-2"
                        />
                        <select value={color} onChange={e => setColor(e.target.value)} className="border px-2 py-1 mb-2 rounded">
                            <option value="bg-blue-100">Blue</option>
                            <option value="bg-green-200">Green</option>
                            <option value="bg-yellow-200">Yellow</option>
                            <option value="bg-red-200">Red</option>
                        </select>
                        <button onClick={saveTask} className="bg-forest text-white px-4 py-2 rounded hover:bg-green-800">Save Task</button>
                    </div>
                ) : (
                    <div onClick={() => setIsEditing(true)} className="mt-6 p-4 border-2 border-dashed rounded text-center text-gray-400 cursor-pointer">
                        + Click here to add a task
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="bg-white min-h-screen">
            <DashboardHeader />
            <div className="max-w-7xl mx-auto p-6 text-forest">
                <div className="flex justify-between items-center mb-4">
                    <div className="space-x-2">
                        {['MONTH', 'WEEK', 'DAY'].map(v => (
                            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 rounded border ${view === v ? 'bg-forest text-white' : 'bg-cream'}`}>{v}</button>
                        ))}
                    </div>
                    <h2 className="text-xl font-semibold">{current.format('MMMM YYYY')}</h2>
                    <div className="space-x-2">
                        <button onClick={goToPrev} className="px-2 py-1 bg-cream border rounded">←</button>
                        <button onClick={goToNext} className="px-2 py-1 bg-cream border rounded">→</button>
                    </div>
                </div>
                <div className="flex gap-6">
                    <div className="w-64 bg-cream border rounded p-4 shadow-sm overflow-y-auto max-h-[90vh]">
                        {renderMonthSidebar()}
                    </div>
                    <div className="flex-1">
                        {view === 'MONTH' && renderMonth()}
                        {view === 'WEEK' && renderWeek()}
                        {view === 'DAY' && renderDay()}
                    </div>
                </div>
            </div>
        </div>
    );
}