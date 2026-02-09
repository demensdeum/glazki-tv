import React, { useState, useEffect } from 'react';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, useColorScheme, Platform, FlatList, BackHandler } from 'react-native';
import {
  Provider as PaperProvider,
  MD3LightTheme,
  MD3DarkTheme,
  Text,
  Appbar,
  BottomNavigation,
  List
} from 'react-native-paper';
import { parse } from 'iptv-playlist-parser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';

import ChannelList from './components/ChannelList';
import ChannelPlayer from './components/ChannelPlayer';
import CountryListView from './components/CountryListView';
import AvailabilityService from './services/AvailabilityService';
import i18n from './utils/i18n';

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
const PLAYLIST_COUNTRY_URL = 'https://iptv-org.github.io/iptv/index.country.m3u';

export default function App() {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;
  const [channels, setChannels] = useState([]);
  const [countryChannels, setCountryChannels] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [index, setIndex] = useState(0);
  const url = Linking.useURL();
  const [routes] = useState([
    { key: 'all', title: i18n.channels, focusedIcon: 'television-classic', unfocusedIcon: 'television' },
    { key: 'available', title: i18n.available, focusedIcon: 'check-circle', unfocusedIcon: 'check-circle-outline' },
    { key: 'countries', title: i18n.countries || 'Countries', focusedIcon: 'earth', unfocusedIcon: 'earth' },
    { key: 'favorites', title: i18n.favorites, focusedIcon: 'heart', unfocusedIcon: 'heart-outline' },
  ]);

  useEffect(() => {
    fetchPlaylist();
    fetchCountryPlaylist();
    loadFavorites();
  }, []);

  useEffect(() => {
    if (channels.length > 0) {
      console.log('First channel structure:', JSON.stringify(channels[0], null, 2));
      console.log('First channel keys:', Object.keys(channels[0]));
      handleDeepLink(url);
    }
  }, [url, channels]);

  // Update browser URL on web when channel is selected/deselected
  useEffect(() => {
    if (channels.length === 0) return;

    if (Platform.OS === 'web') {
      const baseUrl = Constants.expoConfig?.experiments?.baseUrl || '';
      let newUrl = window.location.origin + baseUrl;

      if (selectedChannel) {
        const queryParams = new URLSearchParams(window.location.search);
        // User requested to use name
        queryParams.set('channel', selectedChannel.name);
        newUrl += `/?${queryParams.toString()}`;
      } else {
        // If we are clearing the channel, we might want to preserve other params or just clear 'channel'
        const queryParams = new URLSearchParams(window.location.search);
        queryParams.delete('channel');
        const queryString = queryParams.toString();
        if (queryString) {
          newUrl += `/?${queryString}`;
        }
      }

      if (window.location.href !== newUrl) {
        window.history.pushState({ path: newUrl }, '', newUrl);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChannel]);

  useEffect(() => {
    const onBackPress = () => {
      if (selectedCountry) {
        setSelectedCountry(null);
        return true;
      }
      return false;
    };

    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [selectedCountry]);

  const handleDeepLink = (initialUrl) => {
    if (!initialUrl) return;
    try {
      const { queryParams } = Linking.parse(initialUrl);
      if (queryParams?.channel) {
        let channelName = queryParams.channel;
        console.log('[DeepLink] Received params:', queryParams);
        console.log('[DeepLink] Raw channel name:', channelName);

        // Helper to find channel with normalization
        const findChannel = (nameToFind) => {
          if (!nameToFind) return null;
          const target = nameToFind.trim();
          return channels.find(c => c.name.trim() === target);
        };

        let channel = findChannel(channelName);

        if (!channel) {
          try {
            const decoded = decodeURIComponent(channelName);
            console.log('[DeepLink] Trying decoded:', decoded);
            channel = findChannel(decoded);
          } catch (e) { console.warn('Decode failed', e); }
        }

        if (!channel) {
          try {
            // In case it was double encoded (e.g. from browser address bar copying sometimes)
            const doubleDecoded = decodeURIComponent(decodeURIComponent(channelName));
            console.log('[DeepLink] Trying double decoded:', doubleDecoded);
            channel = findChannel(doubleDecoded);
          } catch (e) { console.warn('Double decode failed', e); }
        }

        if (!channel) {
          // Check for + as space (common in query params)
          console.log('[DeepLink] Trying replacing + with space');
          const spaceReplaced = channelName.replace(/\+/g, ' ');
          channel = findChannel(spaceReplaced);

          if (!channel) {
            const decodedSpaceResult = decodeURIComponent(spaceReplaced);
            channel = findChannel(decodedSpaceResult);
          }
        }

        if (!channel) {
          // Case insensitive fallback
          console.log('[DeepLink] Trying case insensitive match');
          const lowerTarget = decodeURIComponent(channelName).toLowerCase().replace(/\+/g, ' ').trim();
          channel = channels.find(c => c.name.toLowerCase().trim() === lowerTarget);
        }

        if (!channel) {
          // Super aggressive search: normalize both to alphanumeric only
          console.log('[DeepLink] Trying super normalized match');
          // keep only alphanumeric, lowercase
          const normalize = (str) => str ? str.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const targetNormalized = normalize(decodeURIComponent(channelName));

          channel = channels.find(c => normalize(c.name) === targetNormalized);
          if (!channel && channelName.includes('+')) {
            // Try replacing + with space before normalizing (though replace removes it anyway, but decode might care)
            const targetNormalized2 = normalize(decodeURIComponent(channelName.replace(/\+/g, ' ')));
            channel = channels.find(c => normalize(c.name) === targetNormalized2);
          }
        }

        if (channel) {
          console.log('Deep link matched:', channel.name);
          setSelectedChannel(channel);
        } else {
          console.warn('Deep link: Channel not found', channelName);
        }
      }
    } catch (err) {
      console.error('Error handling deep link:', err);
    }
  };

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
      AvailabilityService.scanAll(result.items);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError(i18n.errorLoading);
      setLoading(false);
    }
  };

  const fetchCountryPlaylist = async () => {
    try {
      const response = await fetch(PLAYLIST_COUNTRY_URL);
      const data = await response.text();
      const result = parse(data);
      setCountryChannels(result.items);
    } catch (err) {
      console.error('Error fetching country playlist:', err);
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
      case 'available':
        return (
          <ChannelList
            channels={channels}
            onSelectChannel={(channel) => setSelectedChannel(channel)}
            favorites={favorites}
            onToggleFavorite={onToggleFavorite}
            onlyAvailable={true}
          />
        );
      case 'countries':
        if (selectedCountry) {
          // Detail View: Channels for selected country
          const filtered = countryChannels.filter(c => (c.group?.title || i18n.unknownCategory) === selectedCountry);
          return (
            <View style={{ flex: 1 }}>
              <Appbar.Header elevation={0} style={{ backgroundColor: theme.colors.background }}>
                <Appbar.BackAction onPress={() => setSelectedCountry(null)} />
                <Appbar.Content title={selectedCountry} />
              </Appbar.Header>
              <ChannelList
                channels={filtered}
                onSelectChannel={(channel) => setSelectedChannel(channel)}
                favorites={favorites}
                onToggleFavorite={onToggleFavorite}
              />
            </View>
          );
        } else {
          // Master View: List of countries
          // Extract unique countries
          const countries = Array.from(new Set(countryChannels.map(c => c.group?.title || i18n.unknownCategory))).sort();
          // We can reuse ChannelList if we map countries to channel-like objects, or build a simple list.
          // Let's build a simple list using ChannelList structure but with folder icons?
          // Or just a FlatList here?
          // Better to reuse ChannelList for consistency but "hack" the data? 
          // Or just use a simple ScrollView/FlatList with List.Item.

          return (
            <CountryListView
              countries={countries}
              onSelect={(country) => setSelectedCountry(country)}
              theme={theme}
            />
          );
        }
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
            title={i18n.appName}
            subtitle={routes[index].title}
          />
        </Appbar.Header>

        <View style={currentStyles.content}>
          {loading ? (
            <View style={currentStyles.center}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={currentStyles.loadingText}>{i18n.loadingChannels}</Text>
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
            key={selectedChannel.name}
            channel={selectedChannel}
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
