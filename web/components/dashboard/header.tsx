'use client'

import { useAuth } from '@/hooks/use-auth'
import { useAnalyticsStore } from '@/stores/analytics-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Building2, LogOut, User } from 'lucide-react'

export function Header() {
  const { user, logout } = useAuth()
  const { company } = useAnalyticsStore()

  const handleLogout = async () => {
    await logout()
  }

  return (
    <header className="border-b border-primary/20 bg-panel backdrop-blur-lg sticky top-0 z-50">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold text-primary text-glow">
              Ascendia
            </div>
            {company && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 className="w-4 h-4" />
                <span>{company.company_name}</span>
              </div>
            )}
          </div>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 hover:bg-primary/10"
              >
                <Avatar className="w-8 h-8 border border-primary/30">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {user?.username?.[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-foreground">{user?.email}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-48 bg-card border-primary/20"
            >
              <DropdownMenuItem className="cursor-pointer hover:bg-primary/10">
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer hover:bg-destructive/10 text-destructive focus:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
