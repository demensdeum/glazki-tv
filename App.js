import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, useColorScheme } from 'react-native';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  Text,
  Appbar,
  adaptNavigationTheme
} from 'react-native-paper';
import { parse } from 'iptv-playlist-parser';

import ChannelList from './components/ChannelList';
import ChannelPlayer from './components/ChannelPlayer';

const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
    secondary: '#03dac4',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#bb86fc',
    secondary: '#03dac4',
    background: '#121212',
    surface: '#1e1e1e',
  },
};

const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
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

  const currentStyles = styles(theme);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={currentStyles.container}>
        <Appbar.Header>
          <Appbar.Content title="Glazki TV" subtitle="Global IPTV Player" />
        </Appbar.Header>

        <View style={currentStyles.content}>
          {loading ? (
            <View style={currentStyles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={currentStyles.loadingText}>Loading channels...</Text>
            </View>
          ) : error ? (
            <View style={currentStyles.center}>
              <Text style={currentStyles.errorText}>{error}</Text>
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

const styles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.onSurface,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
});
