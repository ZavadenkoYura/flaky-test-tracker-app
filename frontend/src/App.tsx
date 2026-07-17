import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Login } from '@/pages/Login'
import { Dashboard } from '@/pages/Dashboard'
import { Profile } from '@/pages/Profile'

// Single client for the app's lifetime — created once at module scope so it
// survives re-renders of App itself.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home/dashboard" element={<Dashboard />} />
          <Route path="/home/profile" element={<Profile />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
