import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import io from 'socket.io-client';

const STUN_SERVERS = {
    iceServers: [
        {
            urls: 'stun:stun.l.google.com:19302',
        },
    ],
};

export default function VideoChat() {
    const [stream, setStream] = useState(null);
    const [peerConnection, setPeerConnection] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState('');

    const localVideoRef = useRef();
    const remoteVideoRef = useRef();
    const socketRef = useRef();
    const { currentUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) {
            navigate('/login');
            return;
        }

        // Initialize socket connection
        socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
            auth: {
                token: localStorage.getItem('token'),
            },
        });

        // Initialize media stream
        navigator.mediaDevices
            .getUserMedia({ video: true, audio: true })
            .then((mediaStream) => {
                setStream(mediaStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = mediaStream;
                }
            })
            .catch((err) => {
                setError('Failed to access camera and microphone');
                console.error(err);
            });

        // Socket event listeners
        socketRef.current.on('user-connected', handleUserConnected);
        socketRef.current.on('user-disconnected', handleUserDisconnected);
        socketRef.current.on('offer', handleOffer);
        socketRef.current.on('answer', handleAnswer);
        socketRef.current.on('ice-candidate', handleIceCandidate);
        socketRef.current.on('chat-message', handleChatMessage);

        return () => {
            if (stream) {
                stream.getTracks().forEach((track) => track.stop());
            }
            if (socketRef.current) {
                socketRef.current.disconnect();
            }
            if (peerConnection) {
                peerConnection.close();
            }
        };
    }, [currentUser]);

    const handleUserConnected = (userId) => {
        setIsSearching(false);
        createPeerConnection();
    };

    const handleUserDisconnected = () => {
        setIsConnected(false);
        if (peerConnection) {
            peerConnection.close();
            setPeerConnection(null);
        }
        if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = null;
        }
    };

    const createPeerConnection = () => {
        const pc = new RTCPeerConnection(STUN_SERVERS);
        setPeerConnection(pc);

        // Add local stream
        stream.getTracks().forEach((track) => {
            pc.addTrack(track, stream);
        });

        // Handle ICE candidates
        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socketRef.current.emit('ice-candidate', event.candidate);
            }
        };

        // Handle connection state changes
        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'connected') {
                setIsConnected(true);
            }
        };

        // Handle incoming tracks
        pc.ontrack = (event) => {
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        return pc;
    };

    const handleOffer = async (offer) => {
        const pc = createPeerConnection();
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socketRef.current.emit('answer', answer);
    };

    const handleAnswer = async (answer) => {
        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleIceCandidate = async (candidate) => {
        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleChatMessage = (message) => {
        setMessages((prev) => [...prev, message]);
    };

    const startSearching = () => {
        setIsSearching(true);
        socketRef.current.emit('start-search');
    };

    const stopSearching = () => {
        setIsSearching(false);
        socketRef.current.emit('stop-search');
    };

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const message = {
            text: newMessage,
            sender: currentUser.name,
            timestamp: new Date().toISOString(),
        };

        socketRef.current.emit('chat-message', message);
        setMessages((prev) => [...prev, message]);
        setNewMessage('');
    };

    const toggleMute = () => {
        if (stream) {
            stream.getAudioTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (stream) {
            stream.getVideoTracks().forEach((track) => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
            <div className="relative py-3 sm:max-w-xl sm:mx-auto">
                <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
                    {error && (
                        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                            <span className="block sm:inline">{error}</span>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-8">
                        <div className="relative">
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full rounded-lg"
                            />
                            <div className="absolute bottom-2 left-2 text-white text-sm">
                                You
                            </div>
                        </div>
                        <div className="relative">
                            <video
                                ref={remoteVideoRef}
                                autoPlay
                                playsInline
                                className="w-full rounded-lg bg-gray-900"
                            />
                            <div className="absolute bottom-2 left-2 text-white text-sm">
                                {isConnected ? 'Connected' : 'Waiting for connection...'}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4 mb-8">
                        <button
                            onClick={toggleMute}
                            className={`px-4 py-2 rounded-md ${isMuted ? 'bg-red-600' : 'bg-blue-600'
                                } text-white`}
                        >
                            {isMuted ? 'Unmute' : 'Mute'}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`px-4 py-2 rounded-md ${isVideoOff ? 'bg-red-600' : 'bg-blue-600'
                                } text-white`}
                        >
                            {isVideoOff ? 'Turn On Video' : 'Turn Off Video'}
                        </button>
                        {!isConnected && (
                            <button
                                onClick={isSearching ? stopSearching : startSearching}
                                className="px-4 py-2 rounded-md bg-green-600 text-white"
                            >
                                {isSearching ? 'Stop Searching' : 'Start Searching'}
                            </button>
                        )}
                    </div>

                    <div className="border-t pt-4">
                        <div className="h-64 overflow-y-auto mb-4">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    className={`mb-2 ${message.sender === currentUser.name
                                            ? 'text-right'
                                            : 'text-left'
                                        }`}
                                >
                                    <span className="text-sm text-gray-500">{message.sender}</span>
                                    <div
                                        className={`inline-block p-2 rounded-lg ${message.sender === currentUser.name
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200'
                                            }`}
                                    >
                                        {message.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendMessage} className="flex space-x-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                className="flex-1 px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Type a message..."
                            />
                            <button
                                type="submit"
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Send
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
} 