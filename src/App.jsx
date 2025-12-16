import React, { useState } from 'react'
import GameMap from './components/GameMap'
import WelcomeScreen from './components/WelcomeScreen'
import RoomSelectionScreen from './components/RoomSelectionScreen'

function App() {
    const [playerData, setPlayerData] = useState(null);
    const [roomData, setRoomData] = useState(null);

    const handleJoin = (data) => {
        // Player entered name and avatar
        setPlayerData(data);
    };

    const handleRoomJoined = (data) => {
        // Player created or joined a room
        setRoomData(data);
    };

    const handleLogout = () => {
        // Reset to welcome screen
        setRoomData(null);
        setPlayerData(null);
    };

    return (
        <div className="App" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            {roomData ? (
                // In game
                <GameMap
                    playerName={playerData.name}
                    avatarFile={playerData.avatarFile}
                    avatarId={playerData.avatarId}
                    roomCode={roomData.roomCode}
                    roomName={roomData.roomName}
                    token={roomData.token}
                    isCreator={roomData.isCreator}
                    spawn={roomData.spawn}
                    onLogout={handleLogout}
                />
            ) : playerData ? (
                // Room selection
                <RoomSelectionScreen
                    playerData={playerData}
                    onRoomJoined={handleRoomJoined}
                />
            ) : (
                // Welcome screen
                <WelcomeScreen onJoin={handleJoin} />
            )}
        </div>
    )
}

export default App
