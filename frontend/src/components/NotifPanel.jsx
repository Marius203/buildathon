export default function NotifPanel({ notifications, onClose, onNotifClick }) {
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
        }}
        onClick={onClose}
      />

      {/* Panel */}
      <div className="ec-notif-panel">
        <div className="ec-notif-panel__header">
          <span className="ec-notif-panel__title">NOTIFICĂRI</span>
          <button className="ec-notif-panel__close" onClick={onClose}>✕</button>
        </div>
        <div className="ec-notif-panel__body">
          {notifications.length === 0 && (
            <div className="ec-notif-panel__empty">
              <span style={{ fontSize: 28 }}>🔔</span>
              <p>Nicio notificare momentan.</p>
              <p style={{ fontSize: 12, opacity: 0.6 }}>Vei fi notificat când primești răspunsuri de la admin.</p>
            </div>
          )}
          {notifications.map(n => (
            <div
              key={n.id}
              className={`ec-notif-item${!n.read ? " ec-notif-item--unread" : ""}`}
              onClick={() => onNotifClick(n)}
            >
              <div className="ec-notif-item__icon">
                {n.fromAdmin ? "💬" : "📢"}
              </div>
              <div className="ec-notif-item__content">
                <p className="ec-notif-item__text">{n.text}</p>
                <span className="ec-notif-item__time">
                  {n.time} · <span style={{ color: "#E32636", fontWeight: 700 }}>click pentru detalii →</span>
                </span>
              </div>
              {!n.read && <div className="ec-notif-item__dot"/>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}