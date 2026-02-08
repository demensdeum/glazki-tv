import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconButton, Button } from 'react-native-paper';
import i18n from '../utils/i18n';

export default function ChannelPlayer({ url, onClose }) {
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const hideTimer = useRef(null);
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    player.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playingChange', ({ isPlaying }) => {
      setIsPlaying(isPlaying);
    });
    return () => subscription.remove();
  }, [player]);

  const startHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleInteraction = () => {
    setShowControls(true);
    if (player && !isPlaying) {
      player.play();
    }
    startHideTimer();
  };

  return (
    <Pressable onPress={handleInteraction} style={styles.container}>
      <View
        style={styles.fullSize}
        // @ts-ignore - onPointerMove is supported on web
        onPointerMove={handleInteraction}
      >
        <VideoView
          style={styles.video}
          player={player}
          allowsFullscreen
          allowsPictureInPicture
        />

        {!isPlaying && (
          <View style={styles.playOverlay}>
            <Button
              mode="contained"
              icon="play"
              onPress={handleInteraction}
              contentStyle={styles.playButtonContent}
              labelStyle={styles.playButtonLabel}
            >
              {i18n.play}
            </Button>
          </View>
        )}

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
    </Pressable>
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
  fullSize: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playButtonContent: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  playButtonLabel: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
