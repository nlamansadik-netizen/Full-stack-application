import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import StoriesPage from './pages/StoriesPage'
import StoryDetailPage from './pages/StoryDetailPage'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/stories"
        element={
          <ProtectedRoute>
            <StoriesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/stories/:id"
        element={
          <ProtectedRoute>
            <StoryDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/stories" replace />} />
    </Routes>
  )
}

export default App
