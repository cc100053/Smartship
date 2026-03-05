import { useCallback, useEffect, useRef, useState } from 'react';

const CHANNEL_NAME = 'smartship-viewer';

function isBroadcastChannelSupported() {
  return typeof window !== 'undefined' && typeof window.BroadcastChannel === 'function';
}

export function useBroadcastSender() {
  const channelRef = useRef(null);

  useEffect(() => {
    if (!isBroadcastChannelSupported()) {
      return undefined;
    }

    channelRef.current = new BroadcastChannel(CHANNEL_NAME);

    return () => {
      channelRef.current?.close();
      channelRef.current = null;
    };
  }, []);

  return useCallback((data) => {
    if (!channelRef.current) return;
    channelRef.current.postMessage(data);
  }, []);
}

export function useBroadcastReceiver() {
  const [state, setState] = useState({
    dimensions: null,
    placements: [],
    mode: 'cart',
    connected: false,
  });

  useEffect(() => {
    if (!isBroadcastChannelSupported()) {
      return undefined;
    }

    const channel = new BroadcastChannel(CHANNEL_NAME);

    channel.onmessage = (event) => {
      const data = event.data;
      if (data?.type !== 'CART_UPDATE') return;

      setState({
        dimensions: data.dimensions || null,
        placements: data.placements || [],
        mode: data.mode || 'cart',
        connected: true,
      });
    };

    return () => {
      channel.close();
    };
  }, []);

  return state;
}
