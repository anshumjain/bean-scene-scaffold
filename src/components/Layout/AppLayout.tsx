import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { GlobalWeatherBar } from "./GlobalWeatherBar";
import { Header } from "./Header";

interface AppLayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  showWeather?: boolean;
}

export function AppLayout({ children, showBottomNav = true, showWeather = true }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden w-full max-w-full">
      <Header />
      {showWeather && <GlobalWeatherBar />}
      <main className={cn("w-full max-w-full overflow-x-hidden", showBottomNav && "pb-16")}>
        {children}
      </main>
      {showBottomNav && <BottomNav />}
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}