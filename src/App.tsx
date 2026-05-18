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
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/app" element={<AppShell />}>
                <Route index element={<LessonNotesPage />} />
                <Route path="quiz" element={<QuizGeneratorPage />} />
                <Route path="writing" element={<WritingAssessmentPage />} />
              </Route>
              {/* Legacy redirects */}
              <Route path="/quiz" element={<Navigate to="/app/quiz" replace />} />
              <Route path="/writing" element={<Navigate to="/app/writing" replace />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
