import React, { useRef, useEffect, useState } from 'react';
import * as ort from 'onnxruntime-web';
import * as faceapi from 'face-api.js';

const labels = ['Happy', 'Sad', 'Angry'];

interface CameraProps {
  onEmotionDetected: (emotion: string) => void;
  isRecording: boolean;
  onVideoError: () => void;
}

const CameraComponent: React.FC<CameraProps> = ({ onEmotionDetected, isRecording, onVideoError }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [model, setModel] = useState<ort.InferenceSession | null>(null);
  const [warningMessage, setWarningMessage] = useState<string>('');

  useEffect(() => {
    const loadModels = async () => {
      try {
        // Load face-api.js models
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');

        // Load emotion recognition model using ONNX Runtime
        const session = await ort.InferenceSession.create('emotionRecog_model.onnx');
        setModel(session);
      } catch (error) {
        console.error('Failed to load models:', error);
        setWarningMessage('Failed to load models. Please ensure the model files are available.');
      }
    };

    loadModels();
  }, []);

    useEffect(() => {
      const startVideo = () => {
        navigator.mediaDevices
          .getDisplayMedia({ video: true, audio: false })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
          })
          .catch((error) => {
            console.error('Failed to start video stream:', error);
            setWarningMessage('Failed to access screen. Please check your permissions.');
            onVideoError();

            setTimeout(() => {
              setWarningMessage('');
            }, 3000);
          });
      };
    
      if (isRecording) {
        startVideo();
      } else {
        // Stop the video stream when recording stops
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
          videoRef.current.srcObject = null;
        }
      }
    }, [isRecording]);  

  const processFrame = async () => {
    if (!videoRef.current || !model || !canvasRef.current) return;

    const video = videoRef.current;
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();

    if (canvasRef.current) {
      // Set up canvas dimensions and draw detections
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
      faceapi.draw.drawDetections(canvas, detections);
      faceapi.draw.drawFaceLandmarks(canvas, detections);
    }

    // Process face detection and emotion recognition
    detections.forEach(async (detectionWithLandmarks) => {
      const detection = detectionWithLandmarks.detection;
      const { x, y, width, height } = detection.box;

      const modelInputSize = 224;
      const resizedCanvas = document.createElement('canvas');
      const resizedContext = resizedCanvas.getContext('2d');
      resizedCanvas.width = modelInputSize;
      resizedCanvas.height = modelInputSize;

      if (resizedContext) {
        resizedContext.drawImage(video, x, y, width, height, 0, 0, modelInputSize, modelInputSize);
        const frameImageData = resizedContext.getImageData(0, 0, modelInputSize, modelInputSize);
        const inputTensor = preprocessImage(frameImageData);

        const feeds: Record<string, ort.Tensor> = { sequential_1_input: inputTensor };
        const results = await model.run(feeds);
        const output = results.sequential_3.data as Float32Array;

        const highestIndex = output.indexOf(Math.max(...output));
        const detectedEmotion = labels[highestIndex];

        onEmotionDetected(detectedEmotion);
      }
    });
  };

  const preprocessImage = (imageData: ImageData): ort.Tensor => {
    const { data, width, height } = imageData;
    const input = new Float32Array(width * height * 3);

    for (let i = 0; i < data.length; i += 4) {
      const idx = i / 4;
      input[idx * 3] = data[i] / 255;
      input[idx * 3 + 1] = data[i + 1] / 255;
      input[idx * 3 + 2] = data[i + 2] / 255;
    }

    return new ort.Tensor('float32', input, [1, height, width, 3]);
  };

  useEffect(() => {
    let frameCount = 0;
    const frameDelay = 5;

    const processLoop: FrameRequestCallback = (time: number) => {
      if (frameCount % frameDelay === 0) {
        processFrame();
      }
      frameCount++;
      requestAnimationFrame(processLoop);
    };

    if (model && isRecording) {
      const animationFrameId = requestAnimationFrame(processLoop);
      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [model, isRecording]);

  return (
  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
    {warningMessage && (
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px',
          backgroundColor: 'rgba(255, 0, 0, 0.7)',
          color: 'white',
          borderRadius: '5px',
          zIndex: 10,
        }}
      >
        {warningMessage}
      </div>
    )}
    <video
      ref={videoRef}
      autoPlay
      playsInline
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        position: 'absolute',
        top: 0,
        left: 0,
      }}
    />
  </div>
  );
};

export default CameraComponent;
