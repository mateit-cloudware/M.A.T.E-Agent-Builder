// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSettings = async () => {
    try {
        // M.A.T.E.: Force Enterprise mode when MATE_ENTERPRISE=true
        // This bypasses all Flowise license validation and enables all Enterprise features
        if (process.env.MATE_ENTERPRISE === 'true') {
            return { PLATFORM_TYPE: Platform.ENTERPRISE }
        }

        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    // Fallback to open source when license is invalid
                    return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
                } else {
                    return { PLATFORM_TYPE: Platform.ENTERPRISE }
                }
            }
            case Platform.CLOUD: {
                return { PLATFORM_TYPE: Platform.CLOUD }
            }
            default: {
                return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
            }
        }
    } catch (error) {
        // Return open source on error to ensure UI works
        return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
    }
}

export default {
    getSettings
}
