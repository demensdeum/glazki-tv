import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Pressable, Platform, Image, Text } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconButton, Button } from 'react-native-paper';
import i18n from '../utils/i18n';

export default function ChannelPlayer({ channel, onClose }) {
  const [showControls, setShowControls] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const hideTimer = useRef(null);

  const player = useVideoPlayer(hasStarted ? channel.url : null, (player) => {
    player.loop = false;
    if (hasStarted) {
      player.play();
    }
  });

  useEffect(() => {
    if (!player) return;

    if (hasStarted) {
      player.play();
    }

    const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
      setIsPlaying(isPlaying);
    });
    // @ts-ignore - error event exists in expo-video
    const errorSub = player.addListener('error', (error) => {
      console.error('Video error:', error);
      setVideoError(error.message || 'Unknown error');
    });
    return () => {
      playingSub.remove();
      errorSub.remove();
    };
  }, [player]);

  const startHideTimer = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
    }
    hideTimer.current = setTimeout(() => {
      setShowControls(false);
    }, 3000);
  };

  const handleMouseMove = () => {
    if (hasStarted) {
      setShowControls(true);
      startHideTimer();
    }
  };

  const handleStart = () => {
    console.log('User clicked Play, starting stream...');
    setHasStarted(true);
  };

  const handleContentPress = () => {
    if (!hasStarted) return;

    setShowControls(true);
    startHideTimer();
  };

  return (
    <Pressable onPress={handleContentPress} style={styles.container}>
      <View
        style={styles.fullSize}
        // @ts-ignore - onPointerMove is supported on web
        onPointerMove={handleMouseMove}
      >
        {hasStarted ? (
          <VideoView
            style={styles.video}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            nativeControls={true}
          />
        ) : (
          <View style={styles.previewContainer}>
            {channel.tvg?.logo && (
              <Image source={{ uri: channel.tvg.logo }} style={styles.previewLogo} resizeMode="contain" />
            )}
            <Text style={styles.previewTitle}>{channel.name}</Text>
          </View>
        )}

        {/* Play Button Overlay - Initial Start */}
        {!hasStarted && (
          <View style={styles.playOverlay}>
            <Button
              mode="contained"
              icon="play"
              onPress={handleStart}
              contentStyle={styles.playButtonContent}
              labelStyle={styles.playButtonLabel}
            >
              {i18n.play}
            </Button>
          </View>
        )}

        {videoError && (
          <View style={styles.playOverlay}>
            <IconButton icon="alert-circle" iconColor="red" size={40} />
            <Text style={styles.errorText}>
              {i18n.errorLoading}
            </Text>
            <Text style={styles.errorSubText}>{videoError}</Text>
            <Button
              mode="outlined"
              onPress={() => {
                setVideoError(null);
                player.play();
              }}
              style={{ marginTop: 10 }}
              textColor="white"
            >
              Retry
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
  previewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  previewLogo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  previewTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
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
  errorText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  errorSubText: {
    color: '#ccc',
    fontSize: 12,
    marginTop: 4,
    textAlign: 'center',
  },
});
