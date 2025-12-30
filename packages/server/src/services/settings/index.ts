// TODO: add settings

import { Platform } from '../../Interface'
import { getRunningExpressApp } from '../../utils/getRunningExpressApp'

const getSettings = async () => {
    try {
        const appServer = getRunningExpressApp()
        const platformType = appServer.identityManager.getPlatformType()

        switch (platformType) {
            case Platform.ENTERPRISE: {
                if (!appServer.identityManager.isLicenseValid()) {
                    // M.A.T.E.: Fallback to open source when license is invalid
                    // This ensures the UI still works without a valid enterprise license
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
        // M.A.T.E.: Return open source on error to ensure UI works
        return { PLATFORM_TYPE: Platform.OPEN_SOURCE }
    }
}

export default {
    getSettings
}
