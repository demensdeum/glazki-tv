import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator } from 'react-native';
import { Provider as PaperProvider, DefaultTheme, Text, Appbar } from 'react-native-paper';
import { parse } from 'iptv-playlist-parser';

import ChannelList from './components/ChannelList';
import ChannelPlayer from './components/ChannelPlayer';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#6200ee',
    accent: '#03dac4',
  },
};

const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

export default function App() {
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPlaylist();
  }, []);

  const fetchPlaylist = async () => {
    try {
      setLoading(true);
      const response = await fetch(PLAYLIST_URL);
      const data = await response.text();
      const result = parse(data);
      setChannels(result.items);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError('Failed to load channels. Please try again later.');
      setLoading(false);
    }
  };

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={styles.container}>
        <Appbar.Header>
          <Appbar.Content title="Glazki TV" subtitle="Global IPTV Player" />
        </Appbar.Header>

        <View style={styles.content}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading channels...</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : (
            <ChannelList
              channels={channels}
              onSelectChannel={(channel) => setSelectedChannel(channel)}
            />
          )}
        </View>

        {selectedChannel && (
          <ChannelPlayer
            url={selectedChannel.url}
            onClose={() => setSelectedChannel(null)}
          />
        )}
      </SafeAreaView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    textAlign: 'center',
  },
});
