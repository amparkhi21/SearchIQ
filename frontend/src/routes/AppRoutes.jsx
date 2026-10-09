import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import App from '../App';
import ProtectedRoute from './ProtectedRoute';
import AdminRoute from './AdminRoute';
import Loader from '../components/ui/Loader';
import Home from '../pages/Home';
import Login from '../pages/Login';
import Register from '../pages/Register';
import SearchResults from '../pages/SearchResults';
import ProductDetails from '../pages/ProductDetails';
import Cart from '../pages/Cart';
import Wishlist from '../pages/Wishlist';
import Checkout from '../pages/Checkout';
import Orders from '../pages/Orders';
import OrderDetails from '../pages/OrderDetails';
import Profile from '../pages/Profile';
import Notifications from '../pages/Notifications';
import NotFound from '../pages/NotFound';

// Admin screens are code-split so shoppers never download them.
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const Dashboard = lazy(() => import('../pages/admin/Dashboard'));
const AdminProducts = lazy(() => import('../pages/admin/Products'));
const Inventory = lazy(() => import('../pages/admin/Inventory'));
const AdminOrders = lazy(() => import('../pages/admin/Orders'));
const Analytics = lazy(() => import('../pages/admin/Analytics'));

const guard = (el) => <ProtectedRoute>{el}</ProtectedRoute>;

export default function AppRoutes() {
  return (
    <Suspense fallback={<Loader className="min-h-[60vh]" />}>
      <Routes>
        <Route element={<App />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/products/:id" element={<ProductDetails />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/wishlist" element={guard(<Wishlist />)} />
          <Route path="/checkout" element={guard(<Checkout />)} />
          <Route path="/orders" element={guard(<Orders />)} />
          <Route path="/orders/:id" element={guard(<OrderDetails />)} />
          <Route path="/profile" element={guard(<Profile />)} />
          <Route path="/notifications" element={guard(<Notifications />)} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
