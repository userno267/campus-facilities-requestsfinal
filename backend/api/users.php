<?php
require 'config.php';

// Manage users (admin only).
//   GET  ?action=list                 all users, plus the departments for the forms
//   POST ?action=create               add a user with a temporary password
//   POST ?action=update               change name, role and department
//   POST ?action=set_active           deactivate or reactivate (never deletes, so history is kept)
//
// Safety rules, all checked here on the server:
//  - an admin cannot deactivate themselves or change their own role (so there is always an admin);
//  - a staff member with open jobs cannot be deactivated or moved until the jobs are reassigned;
//  - staff must have a department; faculty and admin must not.

const USER_NAME_MAX  = 255;
const USER_EMAIL_MAX = 255;
const USER_EMPID_MAX = 50;
const USER_ROLES     = ['faculty', 'admin', 'staff'];

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method !== 'GET' && $method !== 'POST') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

$admin = requireUser($conn, ['admin']);

// Stop with an error after undoing the open transaction.
function usersFail(PDO $conn, int $status, string $message): void {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    sendResponse(['error' => $message], $status);
}

// One user in the shape the frontend sees. The password hash is never selected.
function usersShape(array $row): array {
    return [
        'id'              => (int) $row['id'],
        'name'            => $row['name'],
        'email'           => $row['email'],
        'role'            => $row['role'],
        'employee_id'     => $row['employee_id'],
        'department_id'   => $row['department_id'] === null ? null : (int) $row['department_id'],
        'department_name' => $row['department_name'],
        'active'          => (int) $row['active_flag'] === 1,
        'request_count'   => (int) $row['request_count'],
        'open_jobs'       => (int) $row['open_jobs'],
        'review_count'    => (int) $row['review_count'],
        'review_average'  => $row['review_average'] === null ? null : round((float) $row['review_average'], 1),
    ];
}

// Load users with their counts. Pass an id for one user, or null for everyone.
function usersFetch(PDO $conn, ?int $id): array {
    $sql = "
        SELECT u.id, u.name, u.email, u.role, u.employee_id, u.department_id,
               d.name AS department_name,
               CASE WHEN u.active THEN 1 ELSE 0 END AS active_flag,
               (SELECT COUNT(*) FROM requests r WHERE r.created_by = u.id) AS request_count,
               (SELECT COUNT(*) FROM requests r
                 WHERE r.assigned_to = u.id
                   AND r.status IN ('assigned', 'in_progress', 'awaiting_proof', 'paused')) AS open_jobs,
               (SELECT COUNT(*) FROM reviews rv WHERE rv.staff_id = u.id) AS review_count,
               (SELECT AVG(rv.rating) FROM reviews rv WHERE rv.staff_id = u.id) AS review_average
        FROM users u
        LEFT JOIN departments d ON d.id = u.department_id
    ";
    $params = [];
    if ($id !== null) {
        $sql .= ' WHERE u.id = ?';
        $params[] = $id;
    }
    $sql .= ' ORDER BY u.active DESC, lower(u.name), u.id';

    $stmt = $conn->prepare($sql);
    $stmt->execute($params);
    return array_map('usersShape', $stmt->fetchAll());
}

function usersCleanName(array $data): string {
    $name = textField($data, 'name');
    if ($name === '') {
        sendResponse(['error' => 'Please enter a name'], 400);
    }
    if (mb_strlen($name) > USER_NAME_MAX) {
        sendResponse(['error' => 'Name must be ' . USER_NAME_MAX . ' characters or less'], 400);
    }
    return $name;
}

// Read and check role + department together. Returns [role, department_id or null].
function usersRoleAndDepartment(PDO $conn, array $data): array {
    $role = $data['role'] ?? '';
    if (!is_string($role) || !in_array($role, USER_ROLES, true)) {
        sendResponse(['error' => 'Role must be faculty, staff or admin'], 400);
    }
    if ($role !== 'staff') {
        return [$role, null];   // only staff belong to a department
    }
    $deptId = positiveInt($data['department_id'] ?? null, 'Staff must have a department');
    $check = $conn->prepare('SELECT 1 FROM departments WHERE id = ?');
    $check->execute([$deptId]);
    if ($check->fetchColumn() === false) {
        sendResponse(['error' => 'Department not found'], 400);
    }
    return [$role, $deptId];
}

// ---------- GET list ----------
if ($method === 'GET' && $action === 'list') {
    $departments = $conn->query('SELECT id, name FROM departments ORDER BY lower(name)')->fetchAll();
    foreach ($departments as &$d) {
        $d['id'] = (int) $d['id'];
    }
    unset($d);
    sendResponse(['users' => usersFetch($conn, null), 'departments' => $departments], 200);
}

// ---------- POST create ----------
if ($method === 'POST' && $action === 'create') {
    $data       = getJsonBody();
    $name       = usersCleanName($data);
    $email      = strtolower(textField($data, 'email'));
    $employeeId = textField($data, 'employee_id');
    $password   = textField($data, 'password', false);

    if ($email === '' || $employeeId === '' || $password === '') {
        sendResponse(['error' => 'Name, email, employee ID and a temporary password are required'], 400);
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > USER_EMAIL_MAX) {
        sendResponse(['error' => 'Please enter a valid email'], 400);
    }
    if (mb_strlen($employeeId) > USER_EMPID_MAX) {
        sendResponse(['error' => 'Employee ID must be ' . USER_EMPID_MAX . ' characters or less'], 400);
    }
    if (strlen($password) < 6) {
        sendResponse(['error' => 'Password must be at least 6 characters'], 400);
    }
    // bcrypt ignores everything after 72 bytes, so refuse rather than truncate silently.
    if (strlen($password) > 72) {
        sendResponse(['error' => 'Password is too long (maximum 72 bytes)'], 400);
    }
    [$role, $deptId] = usersRoleAndDepartment($conn, $data);

    try {
        $stmt = $conn->prepare(
            'INSERT INTO users (name, email, password_hash, role, employee_id, department_id)
             VALUES (?, ?, ?, ?, ?, ?)
             RETURNING id'
        );
        $stmt->execute([$name, $email, password_hash($password, PASSWORD_DEFAULT),
                        $role, $employeeId, $deptId]);
        $newId = (int) $stmt->fetchColumn();
    } catch (PDOException $e) {
        // SQLSTATE 23505 = unique_violation. The message names the constraint that failed.
        if ($e->getCode() === '23505') {
            if (str_contains($e->getMessage(), 'employee_id')) {
                sendResponse(['error' => 'Employee ID already registered'], 409);
            }
            sendResponse(['error' => 'Email already registered'], 409);
        }
        error_log('Create user failed: ' . $e->getMessage());
        sendResponse(['error' => 'Could not add the user'], 500);
    }

    sendResponse(['user' => usersFetch($conn, $newId)[0]], 201);
}

// ---------- POST update (name, role, department) ----------
if ($method === 'POST' && $action === 'update') {
    $data = getJsonBody();
    $id   = positiveInt($data['id'] ?? null, 'User id must be a number');
    $name = usersCleanName($data);
    [$role, $deptId] = usersRoleAndDepartment($conn, $data);

    $conn->beginTransaction();
    try {
        $cur = $conn->prepare('SELECT role, department_id FROM users WHERE id = ? FOR UPDATE');
        $cur->execute([$id]);
        $old = $cur->fetch();
        if (!$old) {
            usersFail($conn, 404, 'User not found');
        }

        $oldDept = $old['department_id'] === null ? null : (int) $old['department_id'];
        $moved   = $old['role'] !== $role || $oldDept !== $deptId;

        if ($id === (int) $admin['id'] && $role !== 'admin') {
            usersFail($conn, 400, 'You cannot change your own role');
        }

        // A staff member who is leaving their role or department must not have open jobs.
        if ($moved && $old['role'] === 'staff') {
            $open = $conn->prepare(
                "SELECT COUNT(*) FROM requests
                 WHERE assigned_to = ? AND status IN ('assigned', 'in_progress', 'awaiting_proof', 'paused')"
            );
            $open->execute([$id]);
            if ((int) $open->fetchColumn() > 0) {
                usersFail($conn, 409, 'This staff member has open jobs. Reassign or finish them before changing their role or department.');
            }
        }

        $conn->prepare('UPDATE users SET name = ?, role = ?, department_id = ? WHERE id = ?')
             ->execute([$name, $role, $deptId, $id]);
        $conn->commit();
    } catch (PDOException $e) {
        error_log('Update user failed: ' . $e->getMessage());
        usersFail($conn, 500, 'Could not update the user');
    }

    sendResponse(['user' => usersFetch($conn, $id)[0]], 200);
}

// ---------- POST set_active (deactivate or reactivate) ----------
if ($method === 'POST' && $action === 'set_active') {
    $data   = getJsonBody();
    $id     = positiveInt($data['id'] ?? null, 'User id must be a number');
    $active = $data['active'] ?? null;
    if (!is_bool($active)) {
        sendResponse(['error' => 'active must be true or false'], 400);
    }

    if (!$active && $id === (int) $admin['id']) {
        sendResponse(['error' => 'You cannot deactivate your own account'], 400);
    }

    $conn->beginTransaction();
    try {
        $cur = $conn->prepare('SELECT role FROM users WHERE id = ? FOR UPDATE');
        $cur->execute([$id]);
        $row = $cur->fetch();
        if (!$row) {
            usersFail($conn, 404, 'User not found');
        }

        if (!$active && $row['role'] === 'staff') {
            $open = $conn->prepare(
                "SELECT COUNT(*) FROM requests
                 WHERE assigned_to = ? AND status IN ('assigned', 'in_progress', 'awaiting_proof', 'paused')"
            );
            $open->execute([$id]);
            if ((int) $open->fetchColumn() > 0) {
                usersFail($conn, 409, 'This staff member has open jobs. Reassign or finish them before deactivating.');
            }
        }

        $conn->prepare('UPDATE users SET active = ? WHERE id = ?')
             ->execute([$active ? 'true' : 'false', $id]);
        $conn->commit();
    } catch (PDOException $e) {
        error_log('Set active failed: ' . $e->getMessage());
        usersFail($conn, 500, 'Could not update the account');
    }

    sendResponse(['user' => usersFetch($conn, $id)[0]], 200);
}

// A known action sent with the wrong HTTP method gets 405. Anything else is unknown.
if (in_array($action, ['list', 'create', 'update', 'set_active'], true)) {
    sendResponse(['error' => 'Method not allowed'], 405);
}
sendResponse(['error' => 'Invalid action'], 400);
?>
