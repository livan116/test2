# Video Chat Application

A real-time video chat application with features similar to Omegle, including user matching based on preferences and interests.

## Features

- Real-time 1-on-1 video chat using WebRTC
- Text chat during video calls
- User authentication (email/password)
- Smart matching algorithm based on preferences
- Gender and interest-based matching
- Modern UI with Tailwind CSS

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- Modern web browser with WebRTC support

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd videochat
```

2. Install dependencies for both frontend and backend:
```bash
# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install
```

3. Create a `.env` file in the backend directory with the following variables:
```
PORT=3000
MONGODB_URI=mongodb://localhost:27017/videochat
JWT_SECRET=your-super-secret-key-change-this-in-production
FRONTEND_URL=http://localhost:5173
```

4. Start MongoDB:
```bash
# Make sure MongoDB is running on your system
```

5. Start the backend server:
```bash
cd backend
npm run dev
```

6. Start the frontend development server:
```bash
cd frontend
npm run dev
```

7. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Register a new account or login with existing credentials
2. Set your preferences (gender preference and interests)
3. Click "Start Chatting" to begin searching for a match
4. Once matched, you can:
   - Have a video chat
   - Send text messages
   - Toggle audio/video
   - Skip to next user

## Technologies Used

- Frontend:
  - React
  - Tailwind CSS
  - Socket.IO Client
  - WebRTC

- Backend:
  - Node.js
  - Express
  - Socket.IO
  - MongoDB
  - JWT Authentication

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens are used for authentication
- WebRTC connections are secured
- Environment variables are used for sensitive data

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 