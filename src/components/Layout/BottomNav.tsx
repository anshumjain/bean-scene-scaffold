import { Home, Search, Plus, Heart, User } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: Home, label: "Feed", href: "/feed" },
  { icon: Search, label: "Explore", href: "/explore" },
  { icon: Plus, label: "Share", href: "/share" },
  { icon: Heart, label: "Favorites", href: "/favorites" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 coffee-bottom-nav">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {navItems.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg transition-smooth min-w-0 coffee-nav-item",
                isActive
                  ? "coffee-nav-active bg-primary/10"
                  : "coffee-nav-inactive hover:bg-muted/50"
              )
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs leading-tight text-center">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}