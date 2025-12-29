import express from 'express'
import authController from '../../controllers/auth'
const router = express.Router()

// RBAC
router.get(['/', '/permissions'], authController.getAllPermissions)

router.get(['/sso-success'], authController.ssoSuccess)

// M.A.T.E. SSO Integration
router.get(['/mate-sso'], authController.mateSsoHandler)
router.get(['/mate-sso/validate'], authController.mateSsoValidate)

export default router
