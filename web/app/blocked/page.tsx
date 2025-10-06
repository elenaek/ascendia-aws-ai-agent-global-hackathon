import { ShieldX } from 'lucide-react'

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md p-8">
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
            <ShieldX className="w-10 h-10 text-destructive" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">Access Denied</h1>
          <p className="text-muted-foreground">
            Your IP address is not authorized to access this application.
          </p>
        </div>

        <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground">
          <p className="font-semibold mb-2">Error Code: 403</p>
          <p>
            If you believe this is an error, please contact your system administrator
            to request access.
          </p>
        </div>
      </div>
    </div>
  )
}
