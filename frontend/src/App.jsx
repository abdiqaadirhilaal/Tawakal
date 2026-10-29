import { Suspense, lazy } from 'react';
import { Route, Routes } from 'react-router-dom';
import PublicLayout from './layouts/PublicLayout';
import { Spinner } from './components/common/Feedback';
import Home from './pages/public/Home';
import Products from './pages/public/Products';
import ProductDetails from './pages/public/ProductDetails';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import Cart from './pages/public/Cart';
import Checkout from './pages/public/Checkout';
import OrderSuccess from './pages/public/OrderSuccess';
import TrackOrder from './pages/public/TrackOrder';
import NotFound from './pages/public/NotFound';

// Qaybta maamulka waxaa la soo raraa kaliya marka loo baahdo (code splitting).
const AdminApp = lazy(() => import('./AdminApp'));

export default function App() {
  return (
    <Routes>
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<div className="grid min-h-screen place-items-center"><Spinner /></div>}>
            <AdminApp />
          </Suspense>
        }
      />
      <Route element={<PublicLayout />}>
        <Route index element={<Home />} />
        <Route path="alaabta" element={<Products />} />
        <Route path="alaabta/:slug" element={<ProductDetails />} />
        <Route path="nagu-saabsan" element={<About />} />
        <Route path="xiriir" element={<Contact />} />
        <Route path="dambiisha" element={<Cart />} />
        <Route path="dalbo" element={<Checkout />} />
        <Route path="dalab-guul" element={<OrderSuccess />} />
        <Route path="raadraac" element={<TrackOrder />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
