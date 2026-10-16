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
import DashboardPage from "./pages/DashboardPage";
import FolderPage from "./pages/FolderPage";
import K12Page from "./pages/K12Page";
import HigherEdPage from "./pages/HigherEdPage";
import ResourceToolPage from "./pages/ResourceToolPage";
import NotFound from "./pages/NotFound.tsx";
import { AuthProvider } from "./hooks/useAuth";
import { AuthGateProvider } from "./hooks/useAuthGate";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AuthGateProvider>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/k12" element={<K12Page />} />
                <Route path="/higher-ed" element={<HigherEdPage />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/admin" element={<AdminPage />} />
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/dashboard/folders/:id" element={<FolderPage />} />
                <Route path="/app" element={<AppShell />}>
                  <Route index element={<LessonNotesPage />} />
                  <Route path="quiz" element={<QuizGeneratorPage />} />
                  <Route path="writing" element={<WritingAssessmentPage />} />
                  <Route path="writing/bulk" element={<BulkAssessmentPage />} />
                  <Route path="writing/batches" element={<BatchesListPage />} />
                  <Route path="writing/batches/:id" element={<BatchDetailPage />} />
                  <Route path="workspace" element={<MyWorkspacePage />} />
                  <Route path="worksheet" element={<ResourceToolPage key="ws" type="worksheet" />} />
                  <Route path="slides" element={<ResourceToolPage key="sl" type="slides" />} />
                  <Route path="video" element={<ResourceToolPage key="vd" type="video" />} />
                  <Route path="higher-ed/slides" element={<ResourceToolPage key="hsl" type="slides" audience="higher-ed" />} />
                  <Route path="higher-ed/rubric" element={<ResourceToolPage key="hrb" type="rubric" audience="higher-ed" />} />
                  <Route path="marker" element={<Navigate to="/app/writing" replace />} />
                </Route>
                <Route path="/quiz" element={<Navigate to="/app/quiz" replace />} />
                <Route path="/writing" element={<Navigate to="/app/writing" replace />} />
                <Route path="/marker" element={<Navigate to="/app/writing" replace />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AuthGateProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
