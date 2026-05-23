export default function NotifPanel({ notifications, onClose }) {
  return (
    <div className="ec-notif-panel">
      <div className="ec-notif-panel__header">
        <span className="ec-notif-panel__title">NOTIFICĂRI</span>
        <button className="ec-notif-panel__close" onClick={onClose}>✕</button>
      </div>
      <div className="ec-notif-panel__body">
        {notifications.map(n => (
          <div key={n.id} className={`ec-notif-item${!n.read ? " ec-notif-item--unread" : ""}`}>
            {!n.read
              ? <div className="ec-notif-item__dot"/>
              : <div className="ec-notif-item__dot-placeholder"/>
            }
            <div className="ec-notif-item__content">
              <p className="ec-notif-item__text">{n.text}</p>
              <span className="ec-notif-item__time">{n.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
