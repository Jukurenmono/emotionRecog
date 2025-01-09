import React, { useState, useRef, useEffect } from 'react';
import CameraComponent from '../components/CameraComponent';
import EmotionChart from '../components/EmotionChart';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { collection, addDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { doc, deleteDoc } from 'firebase/firestore';


interface Session {
  id: string;
  name: string;
  emotionData: { happy: number; sad: number; angry: number };
  rating: number | null;
}

const RecordingButton: React.FC<{ isRecording: boolean, onClick: () => void, isDisabled: boolean, warning: string }> = ({ isRecording, onClick, isDisabled }) => (
  <div>
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={`w-full py-2 rounded text-white ${isRecording ? 'bg-red-500' : 'bg-green-500'} ${isDisabled ? 'bg-gray-400 cursor-not-allowed' : ''}`}
    >
      {isRecording ? 'Stop Recording' : 'Start Recording'}
    </button>
  </div>
);

interface ConfirmationModalProps {
  isVisible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isVisible, onConfirm, onCancel }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded shadow-lg">
        <h2 className="text-lg font-bold">Confirm Deletion</h2>
        <p>Are you sure you want to delete this session?</p>
        <div className="flex justify-end space-x-4 mt-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

const MeetingAnalyzer: React.FC = () => {
  const [emotionData, setEmotionData] = useState<{ happy: number; sad: number; angry: number }>({ happy: 0, sad: 0, angry: 0 });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [warningMessage, setWarningMessage] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'sessions'));
        const fetchedSessions = querySnapshot.docs.map((doc) => {
          const data = doc.data();
  
          if (
            typeof data.name === 'string' &&
            typeof data.emotionData === 'object' &&
            typeof data.emotionData.happy === 'number' &&
            typeof data.emotionData.sad === 'number' &&
            typeof data.emotionData.angry === 'number' &&
            (data.rating === null || typeof data.rating === 'number')
          ) {
            return {
              id: doc.id,
              name: data.name,
              emotionData: data.emotionData,
              rating: data.rating,
            } as Session;
          } else {
            console.warn('Skipping invalid session data:', data);
            return null;
          }
        });

        setSessions(fetchedSessions.filter((session): session is Session => session !== null));
      } catch (error) {
        console.error('Error fetching sessions:', error);
      }
    };
  
    fetchSessions();
  }, []);

  const handleConfirmDelete = async () => {
    if (sessionToDelete) {
      await handleDeleteSession(sessionToDelete);
      setSessionToDelete(null); // Reset the state
    }
  };
  
  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteDoc(doc(db, 'sessions', sessionId));
      setSessions((prevSessions) =>
        prevSessions.filter((session) => session.id !== sessionId)
      );
      console.log(`Session with ID ${sessionId} deleted successfully.`);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const handleCancelDelete = () => {
    setSessionToDelete(null);
    setIsModalVisible(false);
  };

  const handleEmotionDetected = (emotion: string) => {
    setEmotionData((prevData) => {
      if (emotion === 'Happy') return { ...prevData, happy: prevData.happy + 1 };
      if (emotion === 'Sad') return { ...prevData, sad: prevData.sad + 1 };
      if (emotion === 'Angry') return { ...prevData, angry: prevData.angry + 1 };
      return prevData;
    });
  };

  const handleVideoError = () => {
    setIsRecording(false);
  };

  const startRecording = () => {
    if (!sessionName) {
      setWarningMessage('Please enter a session name before starting the recording.');
      return;
    }
    setIsRecording(true);
    setWarningMessage('');
    recordedChunks.current = [];
  };

  const stopRecording = async () => {
    setIsRecording(false);
  
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  
    const totalEmotions = emotionData.happy + emotionData.sad + emotionData.angry;
    const happinessRatio = totalEmotions > 0 ? emotionData.happy / totalEmotions : 0;
    let rating = 0;
    if (happinessRatio >= 0.8) {
      rating = 5;
    } else if (happinessRatio >= 0.6) {
      rating = 4;
    } else if (happinessRatio >= 0.4) {
      rating = 3;
    } else if (happinessRatio >= 0.2) {
      rating = 2;
    } else {
      rating = 1;
    }
  
    const newSession = {
      name: sessionName || `Session ${sessions.length + 1}`,
      emotionData: { ...emotionData },
      rating,
    };
  
    try {
      const docRef = await addDoc(collection(db, 'sessions'), newSession);
  
      setSessions((prevSessions) => [
        ...prevSessions,
        { id: docRef.id, ...newSession },
      ]);
  
      console.log('Session saved successfully in Firestore with ID:', docRef.id);
    } catch (error) {
      console.error('Error saving session to Firestore:', error);
    }
  
    setEmotionData({ happy: 0, sad: 0, angry: 0 });
    setSessionName('');
    setWarningMessage('');
    recordedChunks.current = [];
  };
  

  const renderStarRating = (rating: number) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      if (i < rating) {
        stars.push(<FaStar key={i} className="text-yellow-500" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-500" />);
      }
    }
    return stars;
  };

  return (
    <div className="flex h-screen text-black">
      <div className="w-3/5 bg-gray-100 flex items-center justify-center">
        <div className="relative w-full max-w-4xl aspect-video bg-black rounded-lg overflow-hidden">
          <h2 className="absolute top-4 left-4 text-white bg-opacity-50 p-2 rounded">Session</h2>
          <CameraComponent
            isRecording={isRecording}
            onEmotionDetected={handleEmotionDetected}
            onVideoError={handleVideoError}
          />
          <video ref={videoRef} autoPlay playsInline muted style={{ display: 'none' }} />
        </div>
      </div>
      <div className="w-3/12 p-4 bg-white">
        <h1 className="text-black font-bold">Meeting Emotion Analysis</h1>
        <EmotionChart emotionData={emotionData} />
        <div className="mt-4 grid grid-col-1 gap-4">
          <input
            type="text"
            value={sessionName}
            onChange={(e) => setSessionName(e.target.value)}
            placeholder="Session Name"
            className="border p-2 rounded w-full"
          />
          <RecordingButton 
            isRecording={isRecording} 
            onClick={isRecording ? stopRecording : startRecording} 
            isDisabled={!sessionName}
            warning={warningMessage}
          />
        </div>
      </div>
      {sessionToDelete && (
        <ConfirmationModal
          isVisible={!!sessionToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
      <div className="w-2/5 bg-gray-200 p-4">
        <div className="relative bg-white z-50 rounded shadow w-full p-5">
          <h2 className="text-xl font-bold">Session Emotion Records</h2>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 95px)' }}>
          {sessions.map((session) => (
            <div key={session.id} className="mb-4 p-4 mt-4 bg-white rounded shadow">
              <h3 className="font-bold">{session.name.toUpperCase()}</h3>
              <EmotionChart emotionData={session.emotionData} />
              <div className="mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="mr-2">Ratings:</p>
                    {renderStarRating(session.rating!)}
                  </div>
                  <button
                    onClick={() => setSessionToDelete(session.id)}
                    className="text-red-500 bg-transparent border border-red-500 hover:bg-red-500 hover:text-white px-3 py-1 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MeetingAnalyzer;
