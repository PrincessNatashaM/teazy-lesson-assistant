import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";
import Layout from "./components/Layout";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import LessonNotesPage from "./pages/LessonNotesPage";
import QuizGeneratorPage from "./pages/QuizGeneratorPage";
import WritingAssessmentPage from "./pages/WritingAssessmentPage";
import BulkAssessmentPage from "./pages/BulkAssessmentPage";
import BatchesListPage from "./pages/BatchesListPage";
import BatchDetailPage from "./pages/BatchDetailPage";
import PricingPage from "./pages/PricingPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import AdminPage from "./pages/AdminPage";
import MyWorkspacePage from "./pages/MyWorkspacePage";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<LessonNotesPage />} />
                  <Route path="quiz" element={<QuizGeneratorPage />} />
                  <Route path="writing" element={<WritingAssessmentPage />} />
                  <Route path="writing/bulk" element={<BulkAssessmentPage />} />
                  <Route path="writing/batches" element={<BatchesListPage />} />
                  <Route path="writing/batches/:id" element={<BatchDetailPage />} />
                  <Route path="workspace" element={<MyWorkspacePage />} />
                  <Route path="marker" element={<Navigate to="/app/writing" replace />} />
                </Route>
                <Route path="/quiz" element={<Navigate to="/app/quiz" replace />} />
                <Route path="/writing" element={<Navigate to="/app/writing" replace />} />
                <Route path="/marker" element={<Navigate to="/app/writing" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
