import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { api } from '../../utils/api';
import { useNavigate } from 'react-router-dom';

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NotificationPanel() {
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const ref = useRef(null);
  const navigate = useNavigate();

  const unread = notifs.filter(n => !n.isRead).length;

  useEffect(() => {
    const load = () =>
      api.getNotifications()
        .then(res => {
          // Normalise: server may return a bare array, { data: [] }, or { docs: [] }
          const list = Array.isArray(res) ? res : (res?.data ?? res?.docs ?? []);
          setNotifs(list);
        })
        .catch(() => {});
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleClick = async (n) => {
    if (!n.isRead) {
      await api.markRead(n._id);
      setNotifs(prev => prev.map(x => x._id === n._id ? { ...x, isRead: true } : x));
    }
    if (n.link) navigate(n.link);
    setOpen(false);
  };

  const markAll = async () => {
    await api.markAllRead();
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const clearRead = async () => {
    try {
      await api.clearReadNotifications();
      setNotifs(prev => prev.filter(n => !n.isRead));
    } catch (err) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const deleteOne = async (e, id) => {
    e.stopPropagation();
    try {
      await api.deleteNotification(id);
      setNotifs(prev => prev.filter(n => n._id !== id));
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        id="notif-btn"
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        aria-controls="notif-panel"
        onClick={() => setOpen(!open)}
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors cursor-pointer"
      >
        <Bell size={17} />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-destructive" />
        )}
      </button>

      {open && (
        <div
          id="notif-panel"
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b border-border">
            <h4 className="text-xs font-bold text-foreground">
              Notifications
              {unread > 0 && <span className="ml-1.5 text-[11px] font-semibold text-primary">({unread} new)</span>}
            </h4>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  type="button"
                  onClick={markAll}
                  className="inline-flex items-center gap-1 bg-none border-0 p-0 text-xs font-semibold text-primary hover:text-primary/80 cursor-pointer"
                >
                  <Check size={12} /> Mark all read
                </button>
              )}
              {notifs.some(n => n.isRead) && (
                <button
                  type="button"
                  onClick={clearRead}
                  className="inline-flex items-center gap-1 bg-none border-0 p-0 text-xs font-semibold text-muted-foreground hover:text-destructive cursor-pointer"
                  title="Clear all read notifications"
                >
                  <Trash2 size={12} /> Clear read
                </button>
              )}
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifs.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">
                No notifications yet
              </div>
            ) : (
              notifs.map(n => (
                <div
                  key={n._id}
                  className={`group relative flex items-start justify-between w-full px-4 py-3 border-b border-border/60 last:border-b-0 transition-colors hover:bg-muted/40 ${
                    n.isRead ? 'bg-card' : 'bg-primary/5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleClick(n)}
                    className="flex-1 text-left bg-transparent border-0 p-0 cursor-pointer"
                  >
                    <div className="text-xs font-bold text-foreground">{n.title}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{n.message}</div>
                    <div className="mt-1 text-[10px] text-muted-foreground/80">{timeAgo(n.createdAt)}</div>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => deleteOne(e, n._id)}
                    aria-label="Delete notification"
                    title="Delete notification"
                    className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-opacity cursor-pointer ml-2 -mr-1"
                  >
                    <X size={13} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
