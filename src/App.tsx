import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Borrowers from "./pages/Borrowers";
import NewBorrower from "./pages/NewBorrower";
import Loans from "./pages/Loans";
import NewLoan from "./pages/NewLoan";
import LoanDetail from "./pages/LoanDetail";
import Repayments from "./pages/Repayments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/borrowers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Borrowers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/borrowers/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewBorrower />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Loans />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <NewLoan />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/loans/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <LoanDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/repayments"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Repayments />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
