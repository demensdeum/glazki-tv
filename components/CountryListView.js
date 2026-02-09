import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { List, Searchbar } from 'react-native-paper';
import i18n from '../utils/i18n';

export default function CountryListView({ countries, onSelect, theme }) {
    const [searchQuery, setSearchQuery] = useState('');

    const onChangeSearch = (query) => setSearchQuery(query);

    const getCountryName = (originalName) => {
        return i18n.countryNames?.[originalName] || originalName;
    };

    const filteredCountries = countries.filter((country) => {
        const translated = getCountryName(country);
        const query = searchQuery.toLowerCase();
        return country.toLowerCase().includes(query) || translated.toLowerCase().includes(query);
    });

    return (
        <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
            <Searchbar
                placeholder={i18n.searchCountriesPlaceholder || 'Search countries...'}
                onChangeText={onChangeSearch}
                value={searchQuery}
                style={[styles.searchBar, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
                iconColor={theme.colors.primary}
            />
            <FlatList
                data={filteredCountries}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                    <List.Item
                        title={getCountryName(item)}
                        left={(props) => <List.Icon {...props} icon="folder" color={theme.colors.primary} />}
                        onPress={() => onSelect(item)}
                        style={{
                            borderBottomWidth: StyleSheet.hairlineWidth,
                            borderBottomColor: theme.colors.outlineVariant
                        }}
                    />
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    searchBar: {
        margin: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
});
