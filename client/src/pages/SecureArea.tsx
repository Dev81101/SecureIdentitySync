import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Info, LogOut } from "lucide-react";

const SecureArea = () => {
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  // Define User type for improved type safety
  type User = {
    id: number;
    name: string;
    email: string;
    emailVerified: boolean;
  };
  
  const { data: user, isLoading, isError, isSuccess } = useQuery<User>({
    queryKey: ['/api/user'],
    retry: 1, // Only retry once to avoid excessive requests
  });

  // If user is not authenticated, redirect to login
  useEffect(() => {
    if (isError) {
      // A short delay before redirecting to ensure state is properly updated
      const redirectTimer = setTimeout(() => {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please log in to access this page.",
        });
        navigate("/login");
      }, 300);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [isError, navigate, toast]);

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/logout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
      navigate("/");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging you out.",
      });
    },
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading secure area...</p>
        </div>
      </div>
    );
  }

  // At this point we know user exists and is authenticated
  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center mb-6">
            <div className="bg-blue-100 rounded-full p-3">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="ml-4 text-2xl font-bold">Secure Area</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">User Profile</h3>
            <div className="space-y-3">
              <div className="flex">
                <span className="text-gray-600 w-32">Name:</span>
                <span className="font-medium">{user.name}</span>
              </div>
              <div className="flex">
                <span className="text-gray-600 w-32">Email:</span>
                <span className="font-medium">{user.email}</span>
              </div>
              <div className="flex">
                <span className="text-gray-600 w-32">Status:</span>
                <span className="text-green-600 font-medium flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-1"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Verified
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Security Information
            </h3>
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-start">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <p className="text-sm text-blue-800">
                  Your account is protected by passwordless authentication using
                  public/private key cryptography and biometric verification.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              className="flex items-center"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                "Logging out..."
              ) : (
                <>
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SecureArea;
