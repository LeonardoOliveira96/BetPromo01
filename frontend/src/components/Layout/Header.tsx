import React from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sun, Moon, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const Header = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  
  const isCreatePage = location.pathname === '/criar-promocao';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitials = () => {
    if (!user?.name) return 'U';
    return user.name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 bg-gradient-to-br from-primary to-primary/80 rounded-md flex items-center justify-center text-primary-foreground font-bold text-sm">
            BP
          </div>
          <div>
            <h1 className="font-bold text-lg">BetPromo</h1>
            <p className="text-xs text-muted-foreground -mt-1">
              Gestão de Promoções
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2">
          {/* Nova Promoção - só mostra se não estiver na página de criar */}
          {!isCreatePage && (
            <Button
              onClick={() => navigate('/criar-promocao')}
              size="sm"
              className="hidden sm:flex"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Promoção
            </Button>
          )}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'light' ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground font-medium">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="flex items-center justify-start gap-2 p-2">
                <div className="flex flex-col space-y-1 leading-none">
                  <p className="font-medium text-sm">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;