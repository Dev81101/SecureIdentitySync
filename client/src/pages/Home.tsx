import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Lock, Shield, Key, Globe } from "lucide-react";

const Home = () => {
  const [location, navigate] = useLocation();
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
  });

  return (
    <div className="mx-auto max-w-7xl">
      {/* Hero Section */}
      <div className="text-center py-12 px-4 sm:px-6 lg:py-16 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
          <span className="block">Secure Authentication</span>
          <span className="block text-primary">Without Passwords</span>
        </h1>
        <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
          Experience the next generation of secure, passwordless authentication
          using email verification and face recognition.
        </p>
        <div className="mt-10 flex justify-center">
          {user ? (
            <Button
              className="rounded-md shadow"
              onClick={() => navigate("/secure")}
            >
              Go to Secure Area
            </Button>
          ) : (
            <div className="flex flex-col space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <Button
                className="rounded-md shadow"
                onClick={() => navigate("/register")}
              >
                Create Account
              </Button>
              <Button
                variant="outline"
                className="rounded-md"
                onClick={() => navigate("/login")}
              >
                Sign In
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="py-12 bg-white">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:max-w-7xl lg:px-8">
          <h2 className="text-3xl font-extrabold text-gray-900 text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Feature 1 */}
            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                      <Lock className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    No Passwords
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    Eliminate the security risks and frustration of traditional passwords.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                      <Shield className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    Biometric Security
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    Use your unique facial features for secure authentication.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                      <Key className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    Cryptographic Keys
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    Public/private key cryptography ensures your identity can't be stolen.
                  </p>
                </div>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="pt-6">
              <div className="flow-root bg-gray-50 rounded-lg px-6 pb-8">
                <div className="-mt-6">
                  <div>
                    <span className="inline-flex items-center justify-center p-3 bg-primary rounded-md shadow-lg">
                      <Globe className="h-6 w-6 text-white" aria-hidden="true" />
                    </span>
                  </div>
                  <h3 className="mt-8 text-lg font-medium text-gray-900 tracking-tight">
                    Universal Access
                  </h3>
                  <p className="mt-5 text-base text-gray-500">
                    Access your account from any device with a camera.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
