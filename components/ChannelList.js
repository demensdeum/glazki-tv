import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FlatList, SectionList, StyleSheet, View, Share } from 'react-native';
import { Image } from 'expo-image';
import { List, Searchbar, Divider, Text, Surface, useTheme, IconButton } from 'react-native-paper';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import i18n from '../utils/i18n';
import AvailabilityService from '../services/AvailabilityService';

export default function ChannelList({ channels, onSelectChannel, favorites, onToggleFavorite }) {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');
    const [availabilityTrigger, setAvailabilityTrigger] = useState(0); // For forcing re-render on updates

    const onChangeSearch = (query) => setSearchQuery(query);

    const filteredChannels = channels.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isFavorite = (channelName) => favorites.includes(channelName);

    useEffect(() => {
        const unsubscribe = AvailabilityService.subscribe(() => {
            setAvailabilityTrigger(prev => prev + 1);
        });
        return () => unsubscribe();
    }, []);

    const onViewableItemsChanged = useCallback(({ viewableItems }) => {
        const items = viewableItems.map(item => item.item);
        // SectionList passes section headers too, filter them out
        const channels = items.filter(item => item && item.url);
        AvailabilityService.updateViewableChannels(channels);
    }, []);

    const viewabilityConfig = useRef({
        itemVisiblePercentThreshold: 50,
        minimumViewTime: 300,
    }).current;

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

    const renderItem = ({ item }) => {
        const { status, snapshotUri } = AvailabilityService.getDetails(item.url) || { status: AvailabilityService.getStatus(item.url) };
        let statusColor;
        switch (status) {
            case 'online':
                statusColor = '#4CAF50'; // Green
                break;
            case 'offline':
                statusColor = '#F44336'; // Red
                break;
            default:
                statusColor = '#FFC107'; // Yellow (Unknown)
        }

        return (
            <Surface style={currentStyles.itemContainer}>
                <List.Item
                    title={item.name}
                    description={item.group?.title || i18n.unknownCategory}
                    left={(props) => (
                        <View style={currentStyles.logoContainer}>
                            {snapshotUri ? (
                                <Image
                                    source={{ uri: snapshotUri }}
                                    style={currentStyles.snapshot}
                                    contentFit="cover"
                                />
                            ) : item.tvg?.logo ? (
                                <Image
                                    source={{ uri: item.tvg.logo }}
                                    style={currentStyles.logo}
                                    contentFit="contain"
                                />
                            ) : (
                                <List.Icon {...props} icon="television-play" color={theme.colors.primary} />
                            )}
                        </View>
                    )}
                    right={(props) => (
                        <View style={currentStyles.rightActions}>
                            <View style={[currentStyles.statusIndicator, { backgroundColor: statusColor }]} />
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
    };

    const sections = React.useMemo(() => {
        const groups = {};
        filteredChannels.forEach(channel => {
            const groupName = channel.group?.title || i18n.unknownCategory;
            if (!groups[groupName]) {
                groups[groupName] = [];
            }
            groups[groupName].push(channel);
        });

        return Object.keys(groups).sort().map(groupName => ({
            title: groupName,
            data: groups[groupName],
        }));
    }, [filteredChannels]);

    const renderSectionHeader = ({ section: { title } }) => (
        <Surface style={currentStyles.sectionHeader} elevation={0}>
            <Text style={currentStyles.sectionHeaderText}>{title}</Text>
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
            <React.Fragment>
                {/* Using SectionList from react-native */}
                <SectionList
                    sections={sections}
                    keyExtractor={(item, index) => `${item.name}-${index}`}
                    renderItem={renderItem}
                    renderSectionHeader={renderSectionHeader}
                    contentContainerStyle={currentStyles.listContent}
                    initialNumToRender={20}
                    maxToRenderPerBatch={20}
                    windowSize={10}
                    stickySectionHeadersEnabled={true}
                    onViewableItemsChanged={onViewableItemsChanged}
                    viewabilityConfig={viewabilityConfig}
                    extraData={availabilityTrigger} // Force re-render when status updates
                />
            </React.Fragment>
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
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
    },
    itemContainer: {
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: theme.colors.outlineVariant,
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
    snapshot: {
        width: 48,
        height: 27, // 16:9 aspect ratio roughly
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
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    sectionHeader: {
        backgroundColor: theme.colors.background,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.outlineVariant,
    },
    sectionHeaderText: {
        fontWeight: 'bold',
        fontSize: 18,
        color: theme.colors.primary,
    },
});
