import { Link, useLocation } from "react-router-dom";
import { getUserEmail, isAdmin } from "../utils";

const NAV_ITEMS = [
  { label: "Acasă", to: "/" },
  { label: "Ghid", to: "/guide" },
  { label: "FAQ", to: "/faq" },
  { label: "Planner", to: "/planner" },
];

export default function NavBar({ unread, onBellClick, onAuthClick, onAdminClick, loggedIn, children }) {
  const location = useLocation();

  return (
    <nav className="ec-nav">
      <Link to="/" className="ec-nav__logo">
        <svg width="38" height="38" viewBox="0 0 38 38">
          <polygon points="19,2 36,10.5 36,27.5 19,36 2,27.5 2,10.5" fill="var(--ec-black)" stroke="var(--ec-white)" strokeWidth="2"/>
          <text x="19" y="24" textAnchor="middle" fill="var(--ec-white)" fontSize="12" fontFamily="Oswald, sans-serif" fontWeight="bold" letterSpacing="0.5">EC</text>
        </svg>
        <div>
          <div className="ec-nav__logo-text-top">ELECTRIC</div>
          <div className="ec-nav__logo-text-bottom">CASTLE</div>

        </div>
      </Link>

      <div className="ec-nav__links">
        {NAV_ITEMS.map(item => (
          <Link
            key={item.to}
            to={item.to}
            className={`ec-nav__link${location.pathname === item.to ? " ec-nav__link--active" : ""}`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="ec-nav__actions">
        {loggedIn && isAdmin() && (
          <button onClick={onAdminClick} className="ec-nav__btn ec-nav__btn--admin">
            ⚡ ADMIN
          </button>
        )}
        <button onClick={onAuthClick} className="ec-nav__btn">
          {loggedIn ? `👤 ${getUserEmail()?.split("@")[0]?.toUpperCase()}` : "LOGIN"}
        </button>
        <div style={{ position: "relative" }}>
          <button className="ec-nav__bell" onClick={onBellClick} aria-label="Notificări">
            <svg width="24" height="24" fill="none" stroke="var(--ec-white)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unread > 0 && <span className="ec-nav__bell-badge">{unread}</span>}
          </button>
          {children}
        </div>
      </div>
    </nav>
  );
}
