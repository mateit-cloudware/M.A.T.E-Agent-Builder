# Admin-Rechte-Erkennung (Zentralisiert)

## Übersicht

Die Admin-Rechte-Erkennung wurde in eine wiederverwendbare Utility-Funktion `isOrganizationAdmin()` zentralisiert, um die Komplexität zu reduzieren und Konsistenz über die gesamte Anwendung sicherzustellen.

## Verwendung

### Vollständige Admin-Prüfung (mit Bootstrap-Check)

```typescript
import { isOrganizationAdmin } from '../utils/adminCheck'

const isAdmin = await isOrganizationAdmin({
    userId: user.id,
    roleId: user.roleId,
    roleName: role.name,
    organizationId: org.id,
    assignedWorkspaces: workspaces,
    ownerRole: ownerRole,
    queryRunner: queryRunner  // Optional, aktiviert Bootstrap-Check
})
```

### Schnelle Admin-Prüfung (nur Rollen-basiert)

```typescript
import { isAdminByRole } from '../utils/adminCheck'

const isAdmin = isAdminByRole({
    roleId: user.roleId,
    roleName: role.name,
    ownerRole: ownerRole,
    assignedWorkspaces: workspaces
})
```

### Owner-Rolle laden

```typescript
import { loadOwnerRole } from '../utils/adminCheck'

const ownerRole = await loadOwnerRole(queryRunner)
```

## Prüf-Logik

Die Admin-Prüfung erfolgt in folgender Priorität:

### 1. Explizite Owner-Rolle
- Prüft ob `user.roleId === ownerRole.id`
- Direkteste und zuverlässigste Methode

### 2. Role-Name ist "owner"
- Prüft ob `role.name.toLowerCase() === 'owner'`
- Fallback für Systeme ohne explizite Owner-Rolle-ID

### 3. Owner in zugewiesenem Workspace
- Prüft ob User Owner-Rolle in einem zugewiesenen Workspace hat
- Ermöglicht Multi-Workspace-Admin-Rechte

### 4. Bootstrap-Admin (optional)
- Nur wenn QueryRunner übergeben wird
- Prüft ob User der einzige oder erste User in der Organisation ist
- Ermöglicht Admin-Rechte beim ersten Setup

## Vorteile der Zentralisierung

### ✅ Reduzierte Komplexität
- Alle Admin-Checks verwenden die gleiche Logik
- Keine duplizierten 40+ Zeilen Code mehr

### ✅ Konsistenz
- Einheitliche Admin-Erkennung über alle Komponenten
- Weniger Fehleranfälligkeit

### ✅ Wartbarkeit
- Änderungen an einem Ort statt überall
- Klare Dokumentation der Prüf-Logik

### ✅ Testbarkeit
- Funktion kann isoliert getestet werden
- Einfaches Mocken für Unit-Tests

### ✅ Performance
- Option für schnelle Checks ohne DB-Zugriff (`isAdminByRole`)
- Bootstrap-Check nur wenn nötig

## Integration

Die Funktion wurde bereits integriert in:

- ✅ `enterprise/middleware/passport/index.ts` - Login-Strategie
- ⏳ `enterprise/middleware/mateAuth.ts` - M.A.T.E. SSO Auth (TODO)
- ⏳ `enterprise/sso/SSOBase.ts` - SSO Authentication (TODO)
- ⏳ `enterprise/controllers/workspace.controller.ts` - Workspace-Controller (TODO)

## Logging

Die Funktion loggt alle Admin-Checks:
- `[AdminCheck] User {userId} has explicit owner role`
- `[AdminCheck] User {userId} role name is "owner"`
- `[AdminCheck] User {userId} has owner role in at least one workspace`
- `[AdminCheck] User {userId} is the only/first user in organization`
- `[AdminCheck] User {userId} is NOT an admin`

Fehler werden auch geloggt:
- `[AdminCheck] Error checking bootstrap admin: {error}`

## Migrationsanleitung

### Alt (komplex, 40+ Zeilen):
```typescript
let isOrgAdmin = (
    (ownerRole && workspaceUser.roleId === ownerRole.id) ||
    (role.name && role.name.toLowerCase() === 'owner') ||
    assignedWorkspaces.some(ws => ws.role && ws.role.toLowerCase() === 'owner')
)

if (!isOrgAdmin) {
    const allOrgUsers = await queryRunner.manager
        .createQueryBuilder('OrganizationUser', 'ou')
        .where('ou.organizationId = :orgId', { orgId: organizationUser.organizationId })
        .getMany()
    // ... weitere 20+ Zeilen
}
```

### Neu (einfach, 10 Zeilen):
```typescript
const isOrgAdmin = await checkIsOrganizationAdmin({
    userId: workspaceUser.userId,
    roleId: workspaceUser.roleId,
    roleName: role.name,
    organizationId: organizationUser.organizationId,
    assignedWorkspaces,
    ownerRole,
    queryRunner
})
```

## Nächste Schritte

1. Alle verbleibenden Stellen migrieren (siehe Integration-Liste oben)
2. Unit-Tests für `adminCheck.ts` schreiben
3. Integration-Tests für verschiedene Admin-Szenarien
4. Performance-Monitoring für Bootstrap-Checks
