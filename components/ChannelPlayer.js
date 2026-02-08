import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableWithoutFeedback } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconButton } from 'react-native-paper';

export default function ChannelPlayer({ url, onClose }) {
  const [showControls, setShowControls] = useState(false);
  const hideTimer = useRef(null);
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    player.play();
  });

  const startHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  useEffect(() => {
    if (player) {
      player.play();
    }
    // Remove auto-showing on mount to honor the "appear on first tap" requirement
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [player]);

  const handleInteraction = () => {
    setShowControls(true);
    startHideTimer();
  };

  return (
    <TouchableWithoutFeedback onPress={handleInteraction}>
      <View
        style={styles.container}
        // @ts-ignore - onPointerMove is supported on web in the same way as onMouseMove
        onPointerMove={handleInteraction}
      >
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />
        {showControls && (
          <IconButton
            icon="close"
            size={30}
            iconColor="white"
            style={styles.closeButton}
            onPress={onClose}
          />
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'black',
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});
