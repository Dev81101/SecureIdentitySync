import * as faceapi from 'face-api.js';

const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';

export async function loadFaceRecognitionModels() {
  await Promise.all([
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
  ]);
}

export async function getFaceDescriptor(image: HTMLImageElement | HTMLVideoElement): Promise<Float32Array | null> {
  try {
    // Detect all faces and get the descriptors
    const detections = await faceapi
      .detectSingleFace(image)
      .withFaceLandmarks()
      .withFaceDescriptor();
      
    if (!detections) {
      throw new Error('No face detected');
    }
    
    return detections.descriptor;
  } catch (error) {
    console.error('Error getting face descriptor:', error);
    throw error;
  }
}

export function calculateFaceSimilarity(descriptor1: Float32Array, descriptor2: Float32Array): number {
  return faceapi.euclideanDistance(descriptor1, descriptor2);
}

export function isSameFace(descriptor1: Float32Array, descriptor2: Float32Array, threshold = 0.6): boolean {
  const distance = calculateFaceSimilarity(descriptor1, descriptor2);
  return distance < threshold;
}
