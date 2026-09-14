import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import Layout from '@/components/site/Layout';
import Home from '@/pages/Home';
import BibleStudies from '@/pages/BibleStudies';
import BibleStudyDetail from '@/pages/BibleStudyDetail';
import Watch from '@/pages/Watch';
import VideoDetail from '@/pages/VideoDetail';
import Books from '@/pages/Books';
import EbookDetail from '@/pages/EbookDetail';
import Shop from '@/pages/Shop';
import ProductDetail from '@/pages/ProductDetail';
import FreeResources from '@/pages/FreeResources';
import About from '@/pages/About';
import FAQ from '@/pages/FAQ';
import Contact from '@/pages/Contact';
import Cart from '@/pages/Cart';
import Search from '@/pages/Search';
import Blog from '@/pages/Blog';
import Legal from '@/pages/Legal';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Render the main app
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/bible-studies" element={<BibleStudies />} />
        <Route path="/bible-studies/:slug" element={<BibleStudyDetail />} />
        <Route path="/watch" element={<Watch />} />
        <Route path="/watch/:slug" element={<VideoDetail />} />
        <Route path="/books" element={<Books />} />
        <Route path="/books/:slug" element={<EbookDetail />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:slug" element={<ProductDetail />} />
        <Route path="/free-resources" element={<FreeResources />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/search" element={<Search />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/privacy-policy" element={<Legal />} />
        <Route path="/terms" element={<Legal />} />
        <Route path="/refund-policy" element={<Legal />} />
        <Route path="/digital-product-policy" element={<Legal />} />
        <Route path="/shipping-policy" element={<Legal />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App