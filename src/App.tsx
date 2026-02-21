import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Vehicles from './pages/Vehicles'
import VehicleDetail from './pages/VehicleDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          path="/vehicles"
          element={<ProtectedRoute><Vehicles /></ProtectedRoute>}
        />
        <Route
          path="/vehicles/:id"
          element={<ProtectedRoute><VehicleDetail /></ProtectedRoute>}
        />
      </Route>
    </Routes>
  )
}
