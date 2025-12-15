import React, { useState } from 'react'
import GameMap from './components/GameMap'
import WelcomeScreen from './components/WelcomeScreen'

function App() {
    const [playerData, setPlayerData] = useState(null);

    const handleJoin = (data) => {
        setPlayerData(data);
    };

    return (
        <div className="App" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            {playerData ? (
                <GameMap
                    playerName={playerData.name}
                    avatarFile={playerData.avatarFile}
                    avatarId={playerData.avatarId}
                />
            ) : (
                <WelcomeScreen onJoin={handleJoin} />
            )}
        </div>
    )
}

export default App
