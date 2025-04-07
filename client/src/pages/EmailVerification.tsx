import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Check, Loader2 } from "lucide-react";

const EmailVerification = () => {
  const [location, navigate] = useLocation();
  const params = useParams();
  const { toast } = useToast();
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    // Get the stored email
    const storedEmail = sessionStorage.getItem("auth_email");
    if (storedEmail) {
      setEmail(storedEmail);
    }

    // If this is a verification with token, verify it
    const token = params.token;
    if (token && token !== "pending") {
      verifyToken(token);
    }
  }, [params.token]);

  const verifyToken = async (token: string) => {
    setVerifying(true);
    try {
      const response = await fetch(`/api/verify/${token}`);
      const data = await response.json();
      
      if (response.ok) {
        setVerified(true);
        toast({
          title: "Email verified",
          description: "Your email has been successfully verified.",
        });
        
        // Redirect to face capture after a short delay
        setTimeout(() => {
          navigate("/face-capture?mode=register");
        }, 2000);
      } else {
        toast({
          variant: "destructive",
          title: "Verification failed",
          description: data.message || "Failed to verify your email.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Verification error",
        description: "An error occurred during verification.",
      });
    } finally {
      setVerifying(false);
    }
  };

  const resendVerificationEmail = useMutation({
    mutationFn: async () => {
      // In a real app, you'd have an endpoint to resend the verification email
      // For this demo, we'll just show a success message
      return new Promise(resolve => setTimeout(resolve, 1000));
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Verification email has been resent.",
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Failed to resend",
        description: "Could not resend verification email.",
      });
    }
  });

  // Show pending verification view if no token or token is "pending"
  if (!params.token || params.token === "pending") {
    return (
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 bg-blue-100 p-3 rounded-full w-fit">
              <Mail className="h-10 w-10 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We've sent a verification link to your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">{email || "your email address"}</p>
            </div>
            
            <div className="text-center mb-6">
              <p className="text-sm text-gray-600">
                Click the link in the email to continue the authentication process
              </p>
            </div>
            
            <div className="flex flex-col space-y-4">
              <Button
                variant="outline"
                className="w-full border-primary text-primary"
                onClick={() => resendVerificationEmail.mutate()}
                disabled={resendVerificationEmail.isPending}
              >
                {resendVerificationEmail.isPending ? "Sending..." : "Resend Email"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show verification in progress or success
  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 bg-blue-100 p-3 rounded-full w-fit">
            {verifying ? (
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
            ) : verified ? (
              <Check className="h-10 w-10 text-green-600" />
            ) : (
              <Mail className="h-10 w-10 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {verifying ? "Verifying Email" : verified ? "Email Verified" : "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {verifying
              ? "Please wait while we verify your email address..."
              : verified
              ? "Your email has been successfully verified."
              : "We couldn't verify your email address."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {verified ? (
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-6">
                You will be redirected to the face recognition setup...
              </p>
              <Button
                className="w-full"
                onClick={() => navigate("/face-capture?mode=register")}
              >
                Continue to Face Setup
              </Button>
            </div>
          ) : !verifying && (
            <div className="flex flex-col space-y-4">
              <Button
                variant="outline"
                className="w-full border-primary text-primary"
                onClick={() => resendVerificationEmail.mutate()}
                disabled={resendVerificationEmail.isPending}
              >
                {resendVerificationEmail.isPending ? "Sending..." : "Resend Email"}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate("/login")}
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification;
