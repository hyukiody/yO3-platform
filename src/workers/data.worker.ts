/**
 * Web Worker for client-side video data processing
 * Implements Zero-Trust: Master key NEVER leaves the browser
 */

interface ProcessMessage {
  type: 'process' | 'init';
  encodedData?: ArrayBuffer;
  dataKey?: ArrayBuffer;
  config?: WorkerConfig;
}

interface WorkerConfig {
  algorithm: 'AES-GCM';
  keySize: 256;
}

let config: WorkerConfig = {
  algorithm: 'AES-GCM',
  keySize: 256,
};

self.onmessage = async (e: MessageEvent<ProcessMessage>) => {
  const { type, encodedData, dataKey } = e.data;

  try {
    if (type === 'init') {
      config = e.data.config || config;
      self.postMessage({ 
        type: 'ready', 
        message: 'Worker initialized with AES-256-GCM' 
      });
      return;
    }

    if (type === 'process' && encodedData && dataKey) {
      const processed = await processEncodedData(encodedData, dataKey);
      
      self.postMessage({
        type: 'processed',
        data: processed,
        timestamp: Date.now(),
      });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Process encoded video data using master key
 */
async function processEncodedData(
  encodedData: ArrayBuffer,
  keyData: ArrayBuffer
): Promise<ArrayBuffer> {
  
  // Import master key
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );

  // Extract IV from data prefix (first 12 bytes)
  const dataView = new Uint8Array(encodedData);
  const iv = dataView.slice(0, 12);
  const ciphertext = dataView.slice(12);

  // Process (decrypt) the data
  const processed = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return processed;
}

// Signal worker is loaded
self.postMessage({ type: 'loaded' });
