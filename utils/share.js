import { Share, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import i18n from './i18n';

export const onShare = async (channel) => {
    try {
        const baseUrl = Constants.expoConfig?.experiments?.baseUrl || '';
        let shareUrl = Linking.createURL('', {
            queryParams: { channel: channel.name },
        });

        // On web, if we're deploying to a subfolder, we want the share link to reflect that
        // even if generated in an environment where the subfolder isn't in the path yet.
        if (Platform.OS === 'web' && baseUrl) {
            try {
                const urlObj = new URL(shareUrl);
                if (!urlObj.pathname.startsWith(baseUrl)) {
                    urlObj.pathname = baseUrl + (urlObj.pathname === '/' ? '' : urlObj.pathname);
                    shareUrl = urlObj.toString();
                }
            } catch (e) {
                console.warn('[Share] Could not process web URL with baseUrl:', e);
            }
        }

        console.log(`[Share] Sharing URL: ${shareUrl}`);

        const message = `${i18n.appName}: ${channel.name}\n\n${shareUrl}`;

        await Share.share({
            message: message,
            url: shareUrl, // iOS uses this separately, Android uses message
            title: `${i18n.appName}: ${channel.name}`,
        }, {
            // Android only
            dialogTitle: i18n.shareTitle || `Share ${channel.name}`,
        });
    } catch (error) {
        console.error('Error sharing:', error.message);
    }
};

export default {
    onShare,
};
