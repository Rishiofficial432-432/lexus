import React from 'react';
import { Page, View } from '../types';
import { 
  Home, CheckSquare, List, Calendar, Timer, Target, BarChart3, User, Settings, HelpCircle, FileText as FileTextIcon, Dice6, BookText, Clipboard, FileSearch,
  ChevronLeft, ChevronRight, Briefcase, Users, BrainCircuit, Search, Info, GraduationCap, Clock, Heart, ClipboardList, Plus, Book, LayoutDashboard
} from 'lucide-react';


interface SidebarProps {
  pages: Page[];
  activePageId: string | null;
  onSelectPage: (id: string) => void;
  onNewPage: (title?: string) => Page;
  view: View;
  setView: (view: View) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  onToggleSearch: () => void;
  onGoToLandingPage: () => void;
}

const mainNavItems = [
    { id: 'dashboard', view: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'pages', view: 'notes', icon: Book, label: 'Pages' },
    { id: 'journal', view: 'journal', icon: BookText, label: 'Daily Log' },
    { id: 'visual_mind', view: 'documind', icon: FileSearch, label: 'VisualMind' },
];

const secondaryNavItems = [
    { id: 'academia', view: 'academics', icon: GraduationCap, label: 'Academia' },
    { id: 'cloud_sync', view: 'workspace', icon: Briefcase, label: 'Cloud Sync' },
    { id: 'inspiration', view: 'inspiration', icon: Heart, label: 'Inspiration' },
    { id: 'about', view: 'about', icon: Info, label: 'About' },
];

const Sidebar: React.FC<SidebarProps> = ({
  pages, activePageId, onSelectPage, onNewPage, view, setView, isCollapsed, setIsCollapsed, onToggleSearch, onGoToLandingPage
}) => {
  return (
    <aside className={`bg-card/80 backdrop-blur-xl flex flex-col border-r border-border/50 flex-shrink-0 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="flex-shrink-0 p-4 border-b border-border/50 flex items-center justify-between">
         <button
            type="button"
            onClick={onGoToLandingPage}
            className="flex items-center gap-2 overflow-hidden"
            aria-label="Go to Landing Page"
         >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-lg">L</span>
            </div>
            {!isCollapsed && <h1 className="text-lg font-semibold text-foreground whitespace-nowrap">LEXUS</h1>}
         </button>
         <button 
            onClick={() => setIsCollapsed(!isCollapsed)} 
            className={`p-1.5 rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground`}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
      </div>
      
      <div className="flex-1 flex flex-col justify-between overflow-y-auto overflow-x-hidden">
        <div>
            <nav className="p-3 space-y-1">
                 <button
                    onClick={onToggleSearch}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                    title="AI Search (Cmd/Ctrl+P)"
                >
                    <Search className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span className="flex-1 text-left">AI Search</span>}
                    {!isCollapsed && (
                        <kbd className="inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                            <span>⌘</span>P
                        </kbd>
                    )}
                </button>
                 <button
                    onClick={() => onNewPage()}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors text-muted-foreground hover:bg-accent hover:text-accent-foreground ${isCollapsed ? 'justify-center' : 'justify-start'}`}
                    title="New Page"
                >
                    <Plus className="w-5 h-5 flex-shrink-0" />
                    {!isCollapsed && <span>New Page</span>}
                </button>
            </nav>
             <nav className="p-3 space-y-1">
                 <h3 className={`px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${isCollapsed ? 'hidden' : 'block'}`}>Main</h3>
                {mainNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.view as View)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-start'} ${view === item.view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                        title={item.label}
                    >
                        <item.icon className="w-5 h-5 flex-shrink-0" />
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}
                 {view === 'notes' && !isCollapsed && (
                     <div className="pl-5 pt-1 space-y-1 max-h-48 overflow-y-auto">
                      {pages.map((page) => (
                        <a
                          key={page.id}
                          href="#"
                          onClick={(e) => { e.preventDefault(); onSelectPage(page.id); }}
                          className={`flex items-center gap-3 px-3 py-1.5 text-xs rounded-md transition-colors duration-150 group ${
                            activePageId === page.id
                              ? 'bg-accent/50 text-accent-foreground font-medium'
                              : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
                          }`}
                           title={page.title}
                        >
                          <FileTextIcon className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate flex-1">{page.title}</span>
                        </a>
                      ))}
                    </div>
                 )}
            </nav>
            <nav className="p-3 space-y-1">
                 <h3 className={`px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider ${isCollapsed ? 'hidden' : 'block'}`}>More</h3>
                 {secondaryNavItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setView(item.view as View)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-start'} ${view === item.view ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                        title={item.label}
                    >
                        <item.icon className={`w-5 h-5 flex-shrink-0 ${item.id === 'inspiration' ? 'text-primary' : ''}`} />
                        {!isCollapsed && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>
        </div>

        <div className="mt-auto p-3 border-t border-border/50 space-y-1">
            <button
                onClick={() => setView('settings')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-start'} ${view === 'settings' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                title="Settings"
            >
                <Settings className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Settings</span>}
            </button>
            <button
                onClick={() => setView('help')}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${isCollapsed ? 'justify-center' : 'justify-start'} ${view === 'help' ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'}`}
                title="Help & Guide"
            >
                <HelpCircle className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>Help & Guide</span>}
            </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;