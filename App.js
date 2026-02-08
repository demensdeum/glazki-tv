import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, useColorScheme } from 'react-native';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  Text,
  Appbar,
  BottomNavigation
} from 'react-native-paper';
import { parse } from 'iptv-playlist-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ChannelList from './components/ChannelList';
import ChannelPlayer from './components/ChannelPlayer';

const FAVORITES_KEY = '@glazki_favorites';

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
  const [favorites, setFavorites] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'all', title: 'Channels', focusedIcon: 'television-classic', unfocusedIcon: 'television' },
    { key: 'favorites', title: 'Favorites', focusedIcon: 'heart', unfocusedIcon: 'heart-outline' },
  ]);

  useEffect(() => {
    fetchPlaylist();
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    try {
      const storedFavorites = await AsyncStorage.getItem(FAVORITES_KEY);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
    }
  };

  const onToggleFavorite = async (channelName) => {
    const newFavorites = favorites.includes(channelName)
      ? favorites.filter((name) => name !== channelName)
      : [...favorites, channelName];

    setFavorites(newFavorites);
    try {
      await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavorites));
    } catch (err) {
      console.error('Error saving favorites:', err);
    }
  };

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

  const renderScene = ({ route }) => {
    switch (route.key) {
      case 'all':
        return (
          <ChannelList
            channels={channels}
            onSelectChannel={(channel) => setSelectedChannel(channel)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        );
      case 'favorites':
        return (
          <ChannelList
            channels={channels.filter(c => favorites.includes(c.name))}
            onSelectChannel={(channel) => setSelectedChannel(channel)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
          />
        );
      default:
        return null;
    }
  };

  const currentStyles = styles(theme);

  return (
    <PaperProvider theme={theme}>
      <SafeAreaView style={currentStyles.container}>
        <Appbar.Header elevation={0}>
          <Appbar.Content
            title="Glazki TV"
            subtitle={routes[index].title}
          />
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
            <BottomNavigation
              navigationState={{ index, routes }}
              onIndexChange={setIndex}
              renderScene={renderScene}
              barStyle={{ backgroundColor: theme.colors.elevation.level2 }}
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
