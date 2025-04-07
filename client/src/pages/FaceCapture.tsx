import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, X, Check, Loader2 } from "lucide-react";
import Webcam from "react-webcam";
import * as faceapi from 'face-api.js';
import { loadFaceRecognitionModels, getFaceDescriptor } from "@/lib/faceRecognition";
import { signChallenge } from "@/lib/authUtils";

const FaceCapture = () => {
  const [location, navigate] = useLocation();
  const search = useSearch();
  const mode = new URLSearchParams(search).get('mode') || 'register';
  const { toast } = useToast();
  
  const webcamRef = useRef<Webcam>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [detectionStatus, setDetectionStatus] = useState("Waiting for camera access...");

  useEffect(() => {
    // Initialize face-api.js models
    const initModels = async () => {
      try {
        await loadFaceRecognitionModels();
        setModelsLoaded(true);
        setDetectionStatus("Camera ready. Position your face in the frame.");
      } catch (error) {
        console.error("Error loading face recognition models:", error);
        setDetectionStatus("Failed to load face recognition models.");
        toast({
          variant: "destructive",
          title: "Face Recognition Error",
          description: "Failed to initialize face recognition. Please try again later.",
        });
      }
    };

    initModels();
  }, []);

  const handleCapture = async () => {
    if (!webcamRef.current || !modelsLoaded) return;
    
    try {
      setIsCapturing(true);
      setDetectionStatus("Detecting face...");
      
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error("Failed to capture image");
      }
      
      // Create an image element from the screenshot
      const img = new Image();
      img.src = imageSrc;
      await new Promise((resolve) => (img.onload = resolve));
      
      // Detect face and get descriptor
      const descriptor = await getFaceDescriptor(img);
      
      if (!descriptor) {
        throw new Error("No face detected");
      }
      
      setDetectionStatus("Face detected! Processing...");
      
      if (mode === 'register') {
        await registerFace(Array.from(descriptor));
      } else {
        await verifyFace(Array.from(descriptor));
      }
      
    } catch (error) {
      console.error("Face capture error:", error);
      setDetectionStatus("Face detection failed. Please try again.");
      toast({
        variant: "destructive",
        title: "Face Capture Failed",
        description: (error as Error).message || "Failed to capture face. Please try again.",
      });
      setIsCapturing(false);
    }
  };

  // For registering a new face descriptor
  const registerFaceMutation = useMutation({
    mutationFn: async (faceDescriptor: number[]) => {
      const response = await apiRequest("POST", "/api/register/face", { faceDescriptor });
      return response.json();
    },
    onSuccess: (data) => {
      // Store private key in localStorage (in a real app, consider more secure options)
      localStorage.setItem("auth_private_key", data.privateKey);
      
      toast({
        title: "Face Recognition Setup Complete",
        description: "Your face has been registered successfully.",
      });
      
      // Redirect to success page
      navigate("/secure");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: error.message || "Failed to register face data.",
      });
    },
    onSettled: () => {
      setIsCapturing(false);
    }
  });

  const registerFace = async (faceDescriptor: number[]) => {
    registerFaceMutation.mutate(faceDescriptor);
  };

  // For verifying a face during login
  const verifyFaceMutation = useMutation({
    mutationFn: async (faceDescriptor: number[]) => {
      const response = await apiRequest("POST", "/api/login/face", { faceDescriptor });
      return response.json();
    },
    onSuccess: async (data) => {
      if (data.verified) {
        setDetectionStatus("Face verified! Completing login...");
        
        // Get the stored challenge
        const challenge = sessionStorage.getItem("auth_challenge");
        const privateKey = localStorage.getItem("auth_private_key");
        
        if (!challenge || !privateKey) {
          throw new Error("Authentication data not found");
        }
        
        // Sign the challenge with the private key
        const signature = await signChallenge(challenge, privateKey);
        
        // Verify the signature
        const verifyResponse = await apiRequest("POST", "/api/login/verify", { signature });
        const verifyData = await verifyResponse.json();
        
        // Complete login
        queryClient.invalidateQueries({ queryKey: ['/api/user'] });
        toast({
          title: "Login Successful",
          description: "You've been authenticated successfully.",
        });
        navigate("/secure");
      } else {
        throw new Error("Face verification failed");
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: error.message || "Failed to verify your face.",
      });
    },
    onSettled: () => {
      setIsCapturing(false);
    }
  });

  const verifyFace = async (faceDescriptor: number[]) => {
    verifyFaceMutation.mutate(faceDescriptor);
  };

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {mode === 'register' ? 'Face Registration' : 'Face Recognition'}
          </CardTitle>
          <CardDescription>
            {mode === 'register' 
              ? "Let's set up your face recognition for secure access" 
              : "Position your face in the frame for verification"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="relative rounded-lg overflow-hidden bg-gray-100 aspect-video mx-auto border-2 border-dashed border-gray-300">
              {modelsLoaded ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "user",
                  }}
                  onUserMedia={() => setIsCameraReady(true)}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="h-20 w-20 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">Loading camera...</p>
                  </div>
                </div>
              )}
              
              {/* Face recognition guide overlay */}
              {isCameraReady && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-primary rounded-full opacity-70"></div>
                </div>
              )}
            </div>
            <div className="text-center mt-2 text-sm text-gray-600">
              <span>{detectionStatus}</span>
            </div>
          </div>
          
          <div className="flex flex-col space-y-4">
            <Button
              className="w-full"
              onClick={handleCapture}
              disabled={!isCameraReady || isCapturing || !modelsLoaded}
            >
              {isCapturing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Capture"
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(mode === 'register' ? "/register" : "/login")}
              disabled={isCapturing}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FaceCapture;
