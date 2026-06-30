import { useLocation } from "react-router-dom";
import { isFifa2026IntroActive } from "../constants/fifa2026Intro";
import "./NavbarFifaBall.css";

export default function NavbarFifaBall({ className = "" }) {
  const location = useLocation();
  const onHome = location.pathname === "/";

  if (!isFifa2026IntroActive() || !onHome) return null;

  return (
    <span
      className={`navbar-fifa-ball shrink-0 ${className}`.trim()}
      aria-hidden="true"
      title="World Cup 2026"
    >
      ⚽
    </span>
  );
}
