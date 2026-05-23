export default function NotifPanel({ notifications, onClose, onNotifClick }) {
  return (
    <div className="ec-notif-panel">
      <div className="ec-notif-panel__header">
        <span className="ec-notif-panel__title">NOTIFICĂRI</span>
        <button className="ec-notif-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="ec-notif-panel__body">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`ec-notif-item${!n.read ? " ec-notif-item--unread" : ""}`}
            onClick={n.fromAdmin ? () => onNotifClick(n) : undefined}
            style={n.fromAdmin ? { cursor: "pointer" } : {}}
          >
            {!n.read
              ? <div className="ec-notif-item__dot"/>
              : <div className="ec-notif-item__dot-placeholder"/>
            }
            <div className="ec-notif-item__content">
              <p className="ec-notif-item__text">{n.text}</p>
              <span className="ec-notif-item__time">
                {n.time}
                {n.fromAdmin && <span style={{ marginLeft:"8px", fontSize:"11px", color:"#166534", fontWeight:"bold" }}>↗ Vezi răspuns</span>}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}