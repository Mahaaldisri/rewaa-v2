import { createBrowserRouter } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { HomePage } from "@/pages/HomePage";
import { ProductPage } from "@/pages/ProductPage";
import { CartPage } from "@/pages/CartPage";
import { CheckoutPage } from "@/pages/checkout/CheckoutPage";
import { OrderConfirmationPage } from "@/pages/OrderConfirmationPage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { AccountPage } from "@/pages/account/AccountPage";
import { OrderDetailPage } from "@/pages/account/OrderDetailPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { CategoryPage } from "@/pages/catalog/CategoryPage";
import { BrandPage } from "@/pages/catalog/BrandPage";
import { SearchPage } from "@/pages/catalog/SearchPage";
import { WishlistPage } from "@/pages/catalog/WishlistPage";
import { ComparePage } from "@/pages/catalog/ComparePage";
import { OffersPage } from "@/pages/OffersPage";
import { ServiceDetailPage } from "@/pages/services/ServiceDetailPage";
import { ServiceBookingPage } from "@/pages/services/ServiceBookingPage";
import { ServicesPage } from "@/pages/services/ServicesPage";
import { TrackPage } from "@/pages/help/TrackPage";
import { ReturnsPage } from "@/pages/help/ReturnsPage";
import { ContactPage } from "@/pages/help/ContactPage";
import { WarrantyClaimPage } from "@/pages/help/WarrantyClaimPage";
import { WhatsAppPage } from "@/pages/help/WhatsAppPage";
import { AboutPage } from "@/pages/AboutPage";
import { StoresPage } from "@/pages/StoresPage";
import { BusinessPage } from "@/pages/BusinessPage";
import { LegalPage } from "@/pages/LegalPage";
import { GuidesPage } from "@/pages/guides/GuidesPage";
import { GuidePage } from "@/pages/guides/GuidePage";
import { FaqPage } from "@/pages/FaqPage";
import { ProductFinderPage } from "@/pages/ProductFinderPage";
import { CompatibilityPage } from "@/pages/tools/CompatibilityPage";
import { CalculatorPage } from "@/pages/tools/CalculatorPage";
import { BrandsPage } from "@/pages/catalog/BrandsPage";
import { WholeHousePage } from "@/pages/WholeHousePage";

/**
 * Single route table for the storefront.
 * `/p/*`, `/c/*` and `/b/*` use slug segments so any product, category or brand
 * resolves to the same data-driven page; unknown slugs fall back to the
 * friendly not-found state handled inside each page.
 */
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },

      /* Catalogue */
      { path: "p/*", element: <ProductPage /> },
      { path: "c/:slug", element: <CategoryPage /> },
      { path: "c/:slug/:subSlug", element: <CategoryPage /> },
      { path: "b/:slug", element: <BrandPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "wishlist", element: <WishlistPage /> },
      { path: "compare", element: <ComparePage /> },
      { path: "offers", element: <OffersPage /> },
      { path: "product-finder", element: <ProductFinderPage /> },
      { path: "compatibility", element: <CompatibilityPage /> },
      { path: "calculator", element: <CalculatorPage /> },
      { path: "brands", element: <BrandsPage /> },
      { path: "whole-house", element: <WholeHousePage /> },

      /* Cart & checkout */
      { path: "cart", element: <CartPage /> },
      { path: "checkout", element: <CheckoutPage /> },
      { path: "order/:orderId", element: <OrderConfirmationPage /> },

      /* Services */
      { path: "services", element: <ServicesPage /> },
      { path: "services/book", element: <ServiceBookingPage /> },
      { path: "services/:slug", element: <ServiceDetailPage /> },

      /* Help & after-sales */
      { path: "help/track", element: <TrackPage /> },
      { path: "help/returns", element: <ReturnsPage /> },
      { path: "help/contact", element: <ContactPage /> },
      { path: "help/warranty-claim", element: <WarrantyClaimPage /> },
      { path: "contact/whatsapp", element: <WhatsAppPage /> },
      { path: "faq", element: <FaqPage /> },

      /* Content */
      { path: "about", element: <AboutPage /> },
      { path: "stores", element: <StoresPage /> },
      { path: "business", element: <BusinessPage /> },
      { path: "guides", element: <GuidesPage /> },
      { path: "guides/:slug", element: <GuidePage /> },
      { path: "legal/:slug", element: <LegalPage /> },

      /* Auth & account */
      { path: "login", element: <LoginPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "forgot-password", element: <ForgotPasswordPage /> },
      { path: "reset-password", element: <ForgotPasswordPage mode="reset" /> },
      { path: "account", element: <AccountPage /> },
      { path: "account/orders", element: <AccountPage /> },
      { path: "account/orders/:orderId", element: <OrderDetailPage /> },

      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
