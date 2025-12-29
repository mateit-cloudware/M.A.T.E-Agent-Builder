import logo from '@/assets/images/mate_logo.webp'

// M.A.T.E. uses same logo for both themes
const logoDark = logo

import { useSelector } from 'react-redux'

// ==============================|| M.A.T.E. LOGO ||============================== //

const Logo = () => {
    const customization = useSelector((state) => state.customization)

    return (
        <div style={{ alignItems: 'center', display: 'flex', flexDirection: 'row', marginLeft: '10px' }}>
            <img
                style={{ objectFit: 'contain', height: 'auto', width: 150 }}
                src={customization.isDarkMode ? logoDark : logo}
                alt='M.A.T.E. Agent Builder'
            />
        </div>
    )
}

export default Logo
