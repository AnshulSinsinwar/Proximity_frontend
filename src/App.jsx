import React, { useState } from 'react'
import GameMap from './components/GameMap'

function App() {
    return (
        <div className="App" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
            <GameMap />
        </div>
    )
}

export default App
