import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  
  const { data: user, refetch } = useQuery({
    queryKey: ['/api/user'],
    retry: false,
  });

  const handleLogout = async () => {
    try {
      await apiRequest("POST", "/api/logout");
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      navigate("/");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: "There was a problem logging you out",
      });
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center">
            <Lock className="h-8 w-8 text-primary" />
            <Link href="/">
              <span className="ml-2 text-xl font-bold cursor-pointer">SecureFace</span>
            </Link>
          </div>
          <nav className="hidden md:block">
            <ul className="flex space-x-8">
              <li>
                <Link href="/">
                  <a className={`font-medium ${location === "/" ? "text-primary" : "text-gray-600 hover:text-primary transition"}`}>
                    Home
                  </a>
                </Link>
              </li>
              {user ? (
                <>
                  <li>
                    <Link href="/secure">
                      <a className={`font-medium ${location === "/secure" ? "text-primary" : "text-gray-600 hover:text-primary transition"}`}>
                        Secure Area
                      </a>
                    </Link>
                  </li>
                  <li>
                    <button
                      onClick={handleLogout}
                      className="font-medium text-gray-600 hover:text-primary transition"
                    >
                      Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link href="/login">
                      <a className={`font-medium ${location === "/login" ? "text-primary" : "text-gray-600 hover:text-primary transition"}`}>
                        Login
                      </a>
                    </Link>
                  </li>
                  <li>
                    <Link href="/register">
                      <a className={`font-medium ${location === "/register" ? "text-primary" : "text-gray-600 hover:text-primary transition"}`}>
                        Register
                      </a>
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
          <button
            type="button"
            className="md:hidden p-2 rounded-md text-gray-600"
            onClick={toggleMobileMenu}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        </div>
      </div>
      {/* Mobile menu */}
      <div className={`md:hidden ${isMobileMenuOpen ? "" : "hidden"}`}>
        <div className="px-2 pt-2 pb-3 space-y-1">
          <Link href="/">
            <a className={`block px-3 py-2 rounded-md text-base font-medium ${location === "/" ? "text-primary" : "text-gray-600 hover:text-primary"}`}>
              Home
            </a>
          </Link>
          {user ? (
            <>
              <Link href="/secure">
                <a className={`block px-3 py-2 rounded-md text-base font-medium ${location === "/secure" ? "text-primary" : "text-gray-600 hover:text-primary"}`}>
                  Secure Area
                </a>
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-600 hover:text-primary"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <a className={`block px-3 py-2 rounded-md text-base font-medium ${location === "/login" ? "text-primary" : "text-gray-600 hover:text-primary"}`}>
                  Login
                </a>
              </Link>
              <Link href="/register">
                <a className={`block px-3 py-2 rounded-md text-base font-medium ${location === "/register" ? "text-primary" : "text-gray-600 hover:text-primary"}`}>
                  Register
                </a>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
