import React, { useState } from 'react';
import { FlatList, StyleSheet, View, Image } from 'react-native';
import { List, Searchbar, Divider, Text, Surface, useTheme, IconButton } from 'react-native-paper';

export default function ChannelList({ channels, onSelectChannel, favorites, onToggleFavorite }) {
    const theme = useTheme();
    const [searchQuery, setSearchQuery] = useState('');

    const onChangeSearch = (query) => setSearchQuery(query);

    const filteredChannels = channels.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const isFavorite = (channelName) => favorites.includes(channelName);

    const renderItem = ({ item }) => (
        <Surface style={currentStyles.itemContainer} elevation={1}>
            <List.Item
                title={item.name}
                description={item.group?.title || 'Unknown Category'}
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
                    <IconButton
                        {...props}
                        icon={isFavorite(item.name) ? "heart" : "heart-outline"}
                        iconColor={isFavorite(item.name) ? theme.colors.primary : theme.colors.outline}
                        onPress={() => onToggleFavorite(item.name)}
                    />
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
                placeholder="Search channels..."
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
});
