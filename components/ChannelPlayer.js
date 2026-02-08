import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { IconButton } from 'react-native-paper';

export default function ChannelPlayer({ url, onClose }) {
  const player = useVideoPlayer(url, (player) => {
    player.loop = false;
    player.play();
  });

  return (
    <View style={styles.container}>
      <VideoView
        style={styles.video}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
      />
      <IconButton
        icon="close"
        size={30}
        color="white"
        style={styles.closeButton}
        onPress={onClose}
      />
    </View>
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
