import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Register from "@/pages/Register";
import Login from "@/pages/Login";
import SecureArea from "@/pages/SecureArea";
import EmailVerification from "@/pages/EmailVerification";
import FaceCapture from "@/pages/FaceCapture";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";

function Router() {
  const [location, setLocation] = useLocation();
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
  });

  // Handle verification links
  useEffect(() => {
    if (location.startsWith('/verify/')) {
      const token = location.slice(8);
      setLocation(`/email-verification/${token}`);
    }
  }, [location, setLocation]);

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/register" component={Register} />
      <Route path="/login" component={Login} />
      <Route path="/secure" component={SecureArea} />
      <Route path="/email-verification/:token" component={EmailVerification} />
      <Route path="/face-capture" component={FaceCapture} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Layout>
        <Router />
      </Layout>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
