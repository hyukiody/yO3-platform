import { useState } from 'react'
import UniversalSecurePlayer from '../../components/UniversalSecurePlayer'
import { DevicePairing } from '../../components/DevicePairing'
import { DeviceList } from '../../components/DeviceList'

export default function ZeroTrustVideoDemo() {
  const [activeTab, setActiveTab] = useState<'pairing' | 'devices' | 'player'>('pairing')
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('')

  const handlePairingComplete = (deviceId: string) => {
    setSelectedDeviceId(deviceId)
    setActiveTab('player')
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ 
        fontSize: '2.5rem', 
        marginBottom: '1rem',
        background: 'linear-gradient(135deg, #00FFFF 0%, #FF00FF 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        🔐 Zero-Trust Video System
      </h1>

      <div style={{
        background: 'rgba(0, 255, 255, 0.1)',
        border: '2px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '1.5rem',
        marginBottom: '2rem'
      }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#00FFFF' }}>
          🏗️ CaCTUs Architecture Principles
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid rgba(0, 255, 255, 0.2)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🎯 Zero-Trust</div>
            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
              Edge nodes NEVER encode locally. All encoding happens in Microkernel.
            </div>
          </div>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid rgba(255, 0, 255, 0.2)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>👁️ Seeing-Is-Believing</div>
            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
              QR code visual verification establishes trust between devices.
            </div>
          </div>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid rgba(0, 255, 0, 0.2)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🔒 Client-Side Processing</div>
            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
              Master keys stored in IndexedDB, processing in Web Workers.
            </div>
          </div>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)', 
            padding: '1rem', 
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 0, 0.2)'
          }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>🌊 Split-Brain Flow</div>
            <div style={{ fontSize: '0.9rem', color: '#aaa' }}>
              Red: Encoded video. Blue: Metadata only.
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '1rem', 
        marginBottom: '2rem',
        borderBottom: '2px solid rgba(0, 255, 255, 0.3)'
      }}>
        <button
          onClick={() => setActiveTab('pairing')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'pairing' ? 'rgba(0, 255, 255, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'pairing' ? '3px solid #00FFFF' : '3px solid transparent',
            color: activeTab === 'pairing' ? '#00FFFF' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          📱 Device Pairing
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'devices' ? 'rgba(255, 0, 255, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'devices' ? '3px solid #FF00FF' : '3px solid transparent',
            color: activeTab === 'devices' ? '#FF00FF' : '#aaa',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: 'bold',
            transition: 'all 0.3s'
          }}
        >
          📋 Device List
        </button>
        <button
          onClick={() => setActiveTab('player')}
          disabled={!selectedDeviceId}
          style={{
            padding: '1rem 2rem',
            background: activeTab === 'player' ? 'rgba(0, 255, 0, 0.2)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'player' ? '3px solid #00FF00' : '3px solid transparent',
            color: activeTab === 'player' ? '#00FF00' : '#aaa',
            cursor: selectedDeviceId ? 'pointer' : 'not-allowed',
            fontSize: '1rem',
            fontWeight: 'bold',
            opacity: selectedDeviceId ? 1 : 0.5,
            transition: 'all 0.3s'
          }}
        >
          ▶️ Secure Player
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ minHeight: '400px' }}>
        {activeTab === 'pairing' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#00FFFF' }}>
              📱 Pair New Device
            </h2>
            <p style={{ marginBottom: '2rem', color: '#aaa' }}>
              Scan the QR code with your YO3 Edge Node to establish a secure connection.
              The QR code contains your public key hash for visual verification.
            </p>
            <DevicePairing onPairingComplete={handlePairingComplete} />
          </div>
        )}

        {activeTab === 'devices' && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#FF00FF' }}>
              📋 Paired Devices
            </h2>
            <p style={{ marginBottom: '2rem', color: '#aaa' }}>
              Manage your paired edge nodes. Each device has a unique master key stored securely in IndexedDB.
            </p>
            <DeviceList onDeviceSelect={setSelectedDeviceId} />
          </div>
        )}

        {activeTab === 'player' && selectedDeviceId && (
          <div>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '1rem', color: '#00FF00' }}>
              ▶️ Secure Video Playback
            </h2>
            <p style={{ marginBottom: '2rem', color: '#aaa' }}>
              Video is decoded by the Microkernel and decrypted in a Web Worker using your device's master key.
              The key never leaves your browser.
            </p>
            <div style={{
              background: 'rgba(0, 0, 0, 0.5)',
              border: '2px solid rgba(0, 255, 0, 0.3)',
              borderRadius: '8px',
              padding: '1rem'
            }}>
              <UniversalSecurePlayer 
                mode="live"
                keyStrategy="master"
                videoId="live-stream" 
                deviceId={selectedDeviceId}
                enableDetection={false}
                enableSnapshot={true}
                autoPlay={true}
              />
            </div>
            <div style={{ 
              marginTop: '1rem', 
              padding: '1rem',
              background: 'rgba(255, 255, 0, 0.1)',
              border: '1px solid rgba(255, 255, 0, 0.3)',
              borderRadius: '4px'
            }}>
              <strong style={{ color: '#FFFF00' }}>🔐 Security Flow:</strong>
              <ol style={{ marginTop: '0.5rem', paddingLeft: '1.5rem', color: '#aaa' }}>
                <li>Edge Node captures video frame</li>
                <li>YOLO detects objects (local processing)</li>
                <li>Frame sent to Microkernel via HTTP POST</li>
                <li>Microkernel encodes with AES-256-GCM</li>
                <li>Frontend fetches encoded video</li>
                <li>Web Worker decrypts using IndexedDB master key</li>
                <li>Video plays in browser</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
