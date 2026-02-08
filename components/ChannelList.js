import React, { useState } from 'react';
import { FlatList, StyleSheet, View, Image, Share } from 'react-native';
import { List, Searchbar, Divider, Text, Surface, useTheme, IconButton } from 'react-native-paper';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import i18n from '../utils/i18n';

export default function ChannelList({ channels, onSelectChannel, favorites, onToggleFavorite }) {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const onChangeSearch = (query) => setSearchQuery(query);

    const filteredChannels = channels.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isFavorite = (channelName) => favorites.includes(channelName);

    const onShare = async (channel) => {
        try {
            const baseUrl = Constants.expoConfig?.experiments?.baseUrl || '';
            let shareUrl = Linking.createURL('', {
                queryParams: { channel: channel.name },
            });

            // On web, if we're deploying to a subfolder, we want the share link to reflect that
            // even if generated in an environment where the subfolder isn't in the path yet.
            if (baseUrl && !shareUrl.includes(baseUrl)) {
                const urlObj = new URL(shareUrl);
                urlObj.pathname = baseUrl + (urlObj.pathname === '/' ? '' : urlObj.pathname);
                shareUrl = urlObj.toString();
            }

            await Share.share({
                message: shareUrl,
            });
        } catch (error) {
            console.error('Error sharing:', error.message);
        }
    };

    const renderItem = ({ item }) => (
        <Surface style={currentStyles.itemContainer} elevation={1}>
            <List.Item
                title={item.name}
                description={item.group?.title || i18n.unknownCategory}
                left={(props) => (
                    <View style={currentStyles.logoContainer}>
                        {item.tvg?.logo ? (
                            <Image
                                source={{ uri: item.tvg.logo }}
                                style={currentStyles.logo}
                                resizeMode="contain"
                            />
                        ) : (
                            <List.Icon {...props} icon="television-play" color={theme.colors.primary} />
                        )}
                    </View>
                )}
                right={(props) => (
                    <View style={currentStyles.rightActions}>
                        <IconButton
                            {...props}
                            icon="share-variant"
                            iconColor={theme.colors.outline}
                            onPress={() => onShare(item)}
                        />
                        <IconButton
                            {...props}
                            icon={isFavorite(item.name) ? "heart" : "heart-outline"}
                            iconColor={isFavorite(item.name) ? theme.colors.primary : theme.colors.outline}
                            onPress={() => onToggleFavorite(item.name)}
                        />
                    </View>
                )}
                onPress={() => onSelectChannel(item)}
                titleStyle={currentStyles.title}
                descriptionStyle={currentStyles.description}
            />
        </Surface>
    );

    const currentStyles = styles(theme);

    return (
        <View style={currentStyles.container}>
            <Searchbar
                placeholder={i18n.searchPlaceholder}
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={currentStyles.searchBar}
                iconColor={theme.colors.primary}
            />
            <FlatList
                data={filteredChannels}
                keyExtractor={(item, index) => `${item.name}-${index}`}
                renderItem={renderItem}
                contentContainerStyle={currentStyles.listContent}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={10}
            />
        </View>
    );
}

const styles = (theme) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    searchBar: {
        margin: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        elevation: 2,
    },
    itemContainer: {
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
    },
    logoContainer: {
        width: 50,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    logo: {
        width: 44,
        height: 44,
        borderRadius: 4,
    },
    title: {
        fontWeight: '700',
        fontSize: 16,
        color: theme.colors.onSurface,
    },
    description: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 13,
    },
    listContent: {
        paddingBottom: 24,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
