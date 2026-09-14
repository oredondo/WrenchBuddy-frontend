import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import VehicleDetail from './pages/VehicleDetail'
import Garage from './pages/Garage'
import GarageProfile from './pages/GarageProfile'
import MyGarage from './pages/MyGarage'
import Profile from './pages/Profile'
import Feed from './pages/Feed'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/garage" element={<ProtectedRoute><Garage /></ProtectedRoute>} />
        <Route path="/garage/:username" element={<ProtectedRoute><GarageProfile /></ProtectedRoute>} />
        <Route
          path="/migaraje/:username"
          element={<ProtectedRoute><MyGarage /></ProtectedRoute>}
        />

        <Route
          path="/feed"
          element={<ProtectedRoute><Feed /></ProtectedRoute>}
        />
        <Route
          path="/profile"
          element={<ProtectedRoute><Profile /></ProtectedRoute>}
        />
        <Route
          path="/vehicles/:id"
          element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>}
        />
      </Route>
    </Routes>
  )
}
