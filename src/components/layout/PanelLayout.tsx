import { NavLink, Outlet } from "react-router-dom";
import { Icon, type IconName } from "../Icon";

export interface PanelLink {
  to: string;
  label: string;
  icon: IconName;
  end?: boolean;
}

/** Side navigation for the artisan and administrator areas. */
export function PanelLayout({ title, links }: { title: string; links: PanelLink[] }) {
  return (
    <div className="panel container">
      <aside className="panel-nav">
        <p className="panel-title">{title}</p>
        <nav>
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end}>
              <Icon name={link.icon} size={17} /> {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="panel-main">
        <Outlet />
      </div>
    </div>
  );
}
