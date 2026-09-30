import { Route, Routes } from "react-router-dom"
import { AppShell } from "./components/AppShell"
import Landing from "./pages/Landing"
import Dashboard from "./pages/Dashboard"
import Watchlist from "./pages/Watchlist"
import OptionChain from "./pages/OptionChain"
import Portfolio from "./pages/Portfolio"
import Orders from "./pages/Orders"
import AdminBroker from "./pages/AdminBroker"
import Login from "./pages/Login"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/app" element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="watchlist" element={<Watchlist />} />
        <Route path="option-chain" element={<OptionChain />} />
        <Route path="portfolio" element={<Portfolio />} />
        <Route path="orders" element={<Orders />} />
        <Route path="admin/broker" element={<AdminBroker />} />
        <Route path="login" element={<Login />} />
      </Route>
    </Routes>
  )
}
