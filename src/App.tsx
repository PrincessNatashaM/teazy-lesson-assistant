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
import AssessmentMarkerPage from "./pages/AssessmentMarkerPage";
import AuthPage from "./pages/AuthPage";
import AccountPage from "./pages/AccountPage";
import AdminPage from "./pages/AdminPage";
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
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<LessonNotesPage />} />
                  <Route path="quiz" element={<QuizGeneratorPage />} />
                  <Route path="marker" element={<AssessmentMarkerPage />} />
                  <Route path="writing" element={<Navigate to="/app/marker" replace />} />
                </Route>
                <Route path="/quiz" element={<Navigate to="/app/quiz" replace />} />
                <Route path="/writing" element={<Navigate to="/app/marker" replace />} />
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
