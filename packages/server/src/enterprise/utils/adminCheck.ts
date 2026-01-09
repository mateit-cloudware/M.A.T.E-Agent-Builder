import { QueryRunner } from 'typeorm'
import { Role, GeneralRole } from '../database/entities/role.entity'
import { IAssignedWorkspace } from '../Interface.Enterprise'

/**
 * Zentralisierte Admin-Rechte-Erkennung
 * 
 * Diese Utility-Funktion vereinfacht die Admin-Prüfung mit einer klaren Priorisierung:
 * 1. Explizite Owner-Rolle (roleId = ownerRole.id)
 * 2. Rolle mit Namen "owner" (case-insensitive)
 * 3. Owner-Rolle in einem zugewiesenen Workspace
 * 4. Bootstrap-Admin (erster Benutzer in Organisation)
 * 
 * @param params - Parameter für Admin-Check
 * @returns true wenn Benutzer Admin-Rechte hat, sonst false
 */

export interface AdminCheckParams {
    // Benutzer-Daten
    userId: string
    roleId: string
    roleName: string
    
    // Organisation-Daten
    organizationId: string
    
    // Workspace-Daten
    assignedWorkspaces?: IAssignedWorkspace[]
    
    // Optional: Owner-Rolle für direkte Prüfung
    ownerRole?: Role | null
    
    // Optional: QueryRunner für Bootstrap-Check
    queryRunner?: QueryRunner
}

/**
 * Prüft ob ein Benutzer Admin-Rechte in seiner Organisation hat
 */
export async function isOrganizationAdmin(params: AdminCheckParams): Promise<boolean> {
    const {
        userId,
        roleId,
        roleName,
        organizationId,
        assignedWorkspaces = [],
        ownerRole,
        queryRunner
    } = params

    // Check 1: Explizite Owner-Rolle
    if (ownerRole && roleId === ownerRole.id) {
        console.log(`[AdminCheck] User ${userId} has explicit owner role`)
        return true
    }

    // Check 2: Rolle mit Namen "owner"
    if (roleName && roleName.toLowerCase() === 'owner') {
        console.log(`[AdminCheck] User ${userId} role name is "owner"`)
        return true
    }

    // Check 3: Owner-Rolle in zugewiesenem Workspace
    const hasOwnerWorkspace = assignedWorkspaces.some(
        ws => ws.role && ws.role.toLowerCase() === 'owner'
    )
    if (hasOwnerWorkspace) {
        console.log(`[AdminCheck] User ${userId} has owner role in at least one workspace`)
        return true
    }

    // Check 4: Bootstrap-Admin (nur wenn QueryRunner verfügbar)
    if (queryRunner) {
        try {
            const orgUsers = await queryRunner.manager
                .createQueryBuilder('OrganizationUser', 'ou')
                .where('ou.organizationId = :orgId', { orgId: organizationId })
                .orderBy('ou.createdDate', 'ASC')
                .getMany()

            // Einziger Benutzer in Organisation
            if (orgUsers.length === 1 && orgUsers[0].userId === userId) {
                console.log(`[AdminCheck] User ${userId} is the only user in organization - granting admin rights`)
                return true
            }

            // Erster Benutzer in Organisation
            if (orgUsers.length > 0 && orgUsers[0].userId === userId) {
                console.log(`[AdminCheck] User ${userId} is the first user in organization - granting admin rights`)
                return true
            }
        } catch (error) {
            console.error(`[AdminCheck] Error checking bootstrap admin:`, error)
            // Bei Fehler: Kein Admin
            return false
        }
    }

    // Kein Admin-Kriterium erfüllt
    console.log(`[AdminCheck] User ${userId} is NOT an admin`)
    return false
}

/**
 * Vereinfachte Admin-Prüfung nur basierend auf Rolle
 * Ohne Bootstrap-Check, für schnelle Checks ohne DB-Zugriff
 */
export function isAdminByRole(params: {
    roleId: string
    roleName: string
    ownerRole?: Role | null
    assignedWorkspaces?: IAssignedWorkspace[]
}): boolean {
    const { roleId, roleName, ownerRole, assignedWorkspaces = [] } = params

    // Owner-Rolle ID Match
    if (ownerRole && roleId === ownerRole.id) {
        return true
    }

    // Role name "owner"
    if (roleName && roleName.toLowerCase() === 'owner') {
        return true
    }

    // Owner in assigned workspace
    return assignedWorkspaces.some(ws => ws.role && ws.role.toLowerCase() === 'owner')
}

/**
 * Lädt Owner-Rolle aus DB
 * Helper-Funktion für konsistente Owner-Rolle-Abfrage
 */
export async function loadOwnerRole(queryRunner: QueryRunner): Promise<Role | null> {
    try {
        return await queryRunner.manager
            .getRepository(Role)
            .createQueryBuilder('role')
            .where('role.name = :name', { name: GeneralRole.OWNER })
            .andWhere('role.organizationId IS NULL')
            .getOne()
    } catch (error) {
        console.error('[AdminCheck] Error loading owner role:', error)
        return null
    }
}
