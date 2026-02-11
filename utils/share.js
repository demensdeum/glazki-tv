import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import i18n from './i18n';

export const onShare = async (channel) => {
    try {
        const baseUrl = 'https://demensdeum.com/software/glazki-tv';
        let encodedName = encodeURIComponent(channel.name);
        const shareUrl = `${baseUrl}?channel=${encodedName}`;

        console.log(`[Share] Standardized Sharing URL: ${shareUrl}`);

        const message = '';

        await Share.share({
            message: message,
            url: shareUrl,
            title: channel.name,
        }, {
            dialogTitle: i18n.shareTitle,
        });
    } catch (error) {
        console.error('Error sharing:', error.message);
    }
};

export default {
    onShare,
};
