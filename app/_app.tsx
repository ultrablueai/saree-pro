'use client'

import { register } from '../sentry.client.config'

// Register Sentry for error tracking
if (typeof window !== 'undefined') {
  register()
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
      </body>
    </html>
  )
}
