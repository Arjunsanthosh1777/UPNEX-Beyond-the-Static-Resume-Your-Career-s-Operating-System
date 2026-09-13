import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="brand">
        <span className="brand-mark">U</span>
        <span>UPNEX</span>
      </Link>
      <div className="nav-links">
        <a href="#ecosystem">Ecosystem</a>
        <a href="#intelligence">Intelligence</a>
        <a href="#community">Community</a>
      </div>
      <Link className="nav-cta" to="/login">
        Enter UPNEX <ArrowUpRight size={16} />
      </Link>
    </nav>
  );
}