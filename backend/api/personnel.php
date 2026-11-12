<?php
// personnel.php: staff list for the admin assign screen.
// Admin only. Each staff member includes whether they are free to take a job.
require 'config.php';

// Only admins may see the staff list. This also rejects missing or unknown users.
requireUser($conn, ['admin']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

// Optional filter: ?department_id=1 returns only that department's staff.
$params = [];
$where  = "WHERE u.role = 'staff'";
if (isset($_GET['department_id']) && $_GET['department_id'] !== '') {
    $params[] = positiveInt($_GET['department_id'], 'department_id must be a number');
    $where   .= ' AND u.department_id = ?';
}

// "Working" = in_progress or awaiting_proof. The one-working-job index guarantees at most one
// per person, so LIMIT 1 is safe. Queued (assigned) and paused jobs do not make someone busy,
// but they are counted so the admin can see them. working_priority lets the screen show whether
// a new job is urgent enough to be queued behind the current one.
$sql = "
    SELECT u.id,
           u.name,
           u.employee_id,
           u.department_id,
           d.name AS department_name,
           (SELECT r.id FROM requests r
             WHERE r.assigned_to = u.id AND r.status IN ('in_progress', 'awaiting_proof')
             LIMIT 1) AS working_request_id,
           (SELECT r.priority FROM requests r
             WHERE r.assigned_to = u.id AND r.status IN ('in_progress', 'awaiting_proof')
             LIMIT 1) AS working_priority,
           (SELECT COUNT(*) FROM requests r WHERE r.assigned_to = u.id AND r.status = 'assigned') AS queued_count,
           (SELECT COUNT(*) FROM requests r WHERE r.assigned_to = u.id AND r.status = 'paused') AS paused_count
    FROM users u
    JOIN departments d ON d.id = u.department_id
    $where
    ORDER BY u.name
";
$stmt = $conn->prepare($sql);
$stmt->execute($params);
$rows = $stmt->fetchAll();

// Build the shape the frontend expects. Convert ids to real integers.
// is_available = has no working job. active_request_id is the working job (kept for older screens).
$personnel = [];
foreach ($rows as $row) {
    $working = $row['working_request_id'];
    $personnel[] = [
        'id'                => (int) $row['id'],
        'name'              => $row['name'],
        'employee_id'       => $row['employee_id'],
        'department_id'     => (int) $row['department_id'],
        'department_name'   => $row['department_name'],
        'is_available'      => $working === null,
        'active_request_id' => $working === null ? null : (int) $working,
        'working_priority'  => $row['working_priority'],
        'queued_count'      => (int) $row['queued_count'],
        'paused_count'      => (int) $row['paused_count'],
    ];
}

sendResponse(['personnel' => $personnel], 200);
?>
