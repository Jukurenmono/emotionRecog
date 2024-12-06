import React, { useState } from 'react';
import * as ort from 'onnxruntime-web';

const Home: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [emotion, setEmotion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const emotionLabels = ['SAD', 'ANGRY', 'HAPPY'];

  const predictEmotion = async (image: HTMLImageElement) => {
    try {
      setIsLoading(true);
      const session = await ort.InferenceSession.create('emotionRecog_model.onnx');

      const inputTensor = processImage(image);

      const feeds = { 'sequential_1_input': inputTensor };
      const results = await session.run(feeds);
      const output = results['sequential_3'].data as Float32Array;

      const predictedEmotionIndex = output.indexOf(Math.max(...output));
      const predictedEmotion = emotionLabels[predictedEmotionIndex];

      setEmotion(predictedEmotion);
    } catch (error) {
      console.error('Error predicting emotion:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const image = new Image();
        image.src = reader.result as string;
        image.onload = () => {
          predictEmotion(image);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = (image: HTMLImageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const width = 224;
      const height = 224;
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(image, 0, 0, width, height);
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = new Float32Array(width * height * 3);
    
      for (let i = 0; i < width * height; i++) {
        data[i * 3] = imageData.data[i * 4] / 255.0;
        data[i * 3 + 1] = imageData.data[i * 4 + 1] / 255.0;
        data[i * 3 + 2] = imageData.data[i * 4 + 2] / 255.0; 
      }
    
      return new ort.Tensor('float32', data, [1, width, height, 3]);
    }
    
    return new ort.Tensor('float32', [], [1, 224, 224, 3]);
  };
  
  
  

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl mb-4">Emotion Recognition</h1>
      <input
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="border p-2 mb-4"
      />
      {isLoading && <p>Loading...</p>}
      {emotion && !isLoading && <p>Predicted Emotion: {emotion}</p>}
      {imageFile && !isLoading && <img src={URL.createObjectURL(imageFile)} alt="Uploaded" className="w-64 h-64 mt-4" />}
    </div>
  );
};

export default Home;
