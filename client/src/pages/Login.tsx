import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { emailSchema } from "@shared/schema";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Login = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [challenge, setChallenge] = useState<string | null>(null);
  
  // Initialize the form
  const form = useForm({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/login/email", data);
      return response.json();
    },
    onSuccess: (data) => {
      setChallenge(data.challenge);
      if (data.requiresFaceRecognition) {
        navigate("/face-capture?mode=login");
      } else {
        // If no face recognition is set up, we'd handle it differently
        // This is a simplified flow
        toast({
          title: "Login successful",
          description: "You've been logged in successfully.",
        });
        navigate("/secure");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Login failed",
        description: error.message || "There was a problem with your login.",
      });
    },
  });

  const onSubmit = (data: { email: string }) => {
    loginMutation.mutate(data);
    // Store the email in sessionStorage for later use
    sessionStorage.setItem("auth_email", data.email);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Passwordless Login</CardTitle>
          <CardDescription>
            Enter your email to begin the secure authentication process
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="you@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex flex-col space-y-4">
                <Button 
                  type="submit"
                  className="w-full"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Processing..." : "Continue"}
                </Button>
                <div className="text-center">
                  <span className="text-sm text-gray-600">Don't have an account?</span>
                  <Button
                    type="button"
                    variant="link"
                    className="text-sm text-primary font-medium ml-1 p-0"
                    onClick={() => navigate("/register")}
                  >
                    Register
                  </Button>
                </div>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
