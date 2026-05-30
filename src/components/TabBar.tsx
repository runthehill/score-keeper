import { NavLink } from 'react-router-dom';
import { Plus, History, Settings } from './icons';

const tabs = [
  { to: '/', label: 'New Game', Icon: Plus },
  { to: '/history', label: 'History', Icon: History },
  { to: '/settings', label: 'Settings', Icon: Settings },
];

export default function TabBar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line safe-area-pb">
      <div className="flex">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === '/'}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center gap-1 py-2.5 text-[10.5px] font-bold transition-colors ${isActive ? 'text-txt' : 'text-txt-3'}`
            }
          >
            <tab.Icon size={22} />
            {tab.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
