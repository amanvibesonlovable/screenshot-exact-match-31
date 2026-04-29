import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import SurveyPage from "./pages/SurveyPage.tsx";
import AuthPage from "./pages/AuthPage.tsx";
import DashboardPage from "./pages/DashboardPage.tsx";
import TraineeDetailPage from "./pages/TraineeDetailPage.tsx";
import ScoringFrameworkPage from "./pages/ScoringFrameworkPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";
import ResponsesPage from "./pages/ResponsesPage.tsx";
import ActionsPage from "./pages/ActionsPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/s/:token" element={<SurveyPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/dashboard/trainees/:id" element={<TraineeDetailPage />} />
          <Route path="/dashboard/scoring" element={<ScoringFrameworkPage />} />
          <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
          <Route path="/dashboard/responses" element={<ResponsesPage />} />
          <Route path="/dashboard/actions" element={<ActionsPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
