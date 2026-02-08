import * as Localization from 'expo-localization';

const translations = {
    en: {
        appName: 'Glazki TV',
        channels: 'Channels',
        favorites: 'Favorites',
        searchPlaceholder: 'Search channels...',
        loadingChannels: 'Loading channels...',
        errorLoading: 'Failed to load channels. Please try again later.',
        unknownCategory: 'Unknown Category',
        globalSubtitle: 'Global IPTV Player',
        shareMessage: 'Check out this TV channel: ',
        play: 'Play',
    },
    ru: {
        appName: 'Глазки ТВ',
        channels: 'Каналы',
        favorites: 'Избранное',
        searchPlaceholder: 'Поиск каналов...',
        loadingChannels: 'Загрузка каналов...',
        errorLoading: 'Не удалось загрузить каналы. Пожалуйста, попробуйте позже.',
        unknownCategory: 'Неизвестная категория',
        globalSubtitle: 'Глобальный IPTV плеер',
        shareMessage: 'Посмотри этот телеканал: ',
        play: 'Играть',
    },
};

const locale = Localization.getLocales()[0]?.languageCode || 'en';
const strings = translations[locale] || translations.en;

export default strings;
