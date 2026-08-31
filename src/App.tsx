import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './components/PageTransition'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Products } from './pages/Products'
import { ProductDetails } from './pages/ProductDetails'
import { Cart } from './pages/Cart'
import { Checkout } from './pages/Checkout'
import { FAQ } from './pages/FAQ'
import { Policies } from './pages/Policies'
import { NotFound } from './pages/NotFound'
import { Success } from './pages/Success'
import { Dashboard } from './pages/Dashboard'

export default function App() {
  const location = useLocation()

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<PageTransition><Home /></PageTransition>} />
          <Route path="/produtos" element={<PageTransition><Products /></PageTransition>} />
          <Route path="/produtos/:slug" element={<PageTransition><ProductDetails /></PageTransition>} />
          <Route path="/carrinho" element={<PageTransition><Cart /></PageTransition>} />
          <Route path="/checkout" element={<PageTransition><Checkout /></PageTransition>} />
          <Route path="/sucesso" element={<PageTransition><Success /></PageTransition>} />
          <Route path="/pedidos" element={<PageTransition><Dashboard /></PageTransition>} />
          <Route path="/faq" element={<PageTransition><FAQ /></PageTransition>} />
          <Route path="/politicas" element={<PageTransition><Policies /></PageTransition>} />
          <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
        </Routes>
      </AnimatePresence>
    </Layout>
  )
}
