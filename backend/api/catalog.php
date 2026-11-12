<?php
require 'config.php';

// Admin catalog: add, rename and delete departments and categories. Admin only.
// Deleting something in use moves its requests (and, for a department, its staff and
// default categories) to another item first, so nothing is left without a home.

const CATALOG_NAME_MAX = 100; // categories.name is VARCHAR(100); departments use the same limit

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method !== 'GET' && $method !== 'POST') {
    sendResponse(['error' => 'Method not allowed'], 405);
}

requireUser($conn, ['admin']);

// Stop with an error after undoing the open transaction.
function catalogFail(PDO $conn, int $status, string $message, array $extra = []): void {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    sendResponse(array_merge(['error' => $message], $extra), $status);
}

// Trim and check a name from the body.
function catalogName(array $data): string {
    $name = textField($data, 'name');
    if ($name === '') {
        sendResponse(['error' => 'Please enter a name'], 400);
    }
    if (mb_strlen($name) > CATALOG_NAME_MAX) {
        sendResponse(['error' => 'Name must be ' . CATALOG_NAME_MAX . ' characters or less'], 400);
    }
    return $name;
}

// True when another row in $table already has this name (ignoring case).
// $table is always a fixed name written in this file, never user input.
function catalogNameTaken(PDO $conn, string $table, string $name, ?int $exceptId): bool {
    $sql = "SELECT 1 FROM $table WHERE lower(name) = lower(?)";
    $params = [$name];
    if ($exceptId !== null) {
        $sql .= ' AND id <> ?';
        $params[] = $exceptId;
    }
    $stmt = $conn->prepare($sql . ' LIMIT 1');
    $stmt->execute($params);
    return $stmt->fetchColumn() !== false;
}

// Stop with 404 when the row does not exist.
function catalogRequireRow(PDO $conn, string $table, int $id, string $notFound): void {
    $stmt = $conn->prepare("SELECT 1 FROM $table WHERE id = ?");
    $stmt->execute([$id]);
    if ($stmt->fetchColumn() === false) {
        sendResponse(['error' => $notFound], 404);
    }
}

// Run a single count query for one id.
function catalogCount(PDO $conn, string $sql, int $id): int {
    $stmt = $conn->prepare($sql);
    $stmt->execute([$id]);
    return (int) $stmt->fetchColumn();
}

// A unique-name clash that slipped past the check (two admins at once) is a 409.
// Anything else is logged and sent as a generic 500.
function catalogWriteFailed(PDO $conn, PDOException $e, string $duplicateMessage): void {
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    if ($e->getCode() === '23505') {
        sendResponse(['error' => $duplicateMessage], 409);
    }
    error_log('Catalog write failed: ' . $e->getMessage());
    sendResponse(['error' => 'Could not save. Please try again.'], 500);
}

// ---------- GET list: departments and categories with how much each one is used ----------
if ($method === 'GET') {
    if ($action !== 'list') {
        sendResponse(['error' => 'Invalid action'], 400);
    }

    $departments = $conn->query(
        'SELECT d.id, d.name,
                (SELECT COUNT(*) FROM requests r WHERE r.department_id = d.id) AS request_count,
                (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) AS staff_count,
                (SELECT COUNT(*) FROM categories c WHERE c.default_department_id = d.id) AS category_count
         FROM departments d
         ORDER BY d.name'
    )->fetchAll();

    $categories = $conn->query(
        'SELECT c.id, c.name, c.default_department_id, d.name AS default_department_name,
                (SELECT COUNT(*) FROM requests r WHERE r.category_id = c.id) AS request_count
         FROM categories c
         JOIN departments d ON d.id = c.default_department_id
         ORDER BY c.name'
    )->fetchAll();

    // Postgres sends numbers as text. Turn them into real numbers for the app.
    $departments = array_map(fn($d) => [
        'id'             => (int) $d['id'],
        'name'           => $d['name'],
        'request_count'  => (int) $d['request_count'],
        'staff_count'    => (int) $d['staff_count'],
        'category_count' => (int) $d['category_count'],
    ], $departments);

    $categories = array_map(fn($c) => [
        'id'                      => (int) $c['id'],
        'name'                    => $c['name'],
        'default_department_id'   => (int) $c['default_department_id'],
        'default_department_name' => $c['default_department_name'],
        'request_count'           => (int) $c['request_count'],
    ], $categories);

    sendResponse(['departments' => $departments, 'categories' => $categories], 200);
}

// ---------- POST: add, rename, delete (admin only) ----------
$data = getJsonBody();

switch ($action) {

    case 'dept_create':
        $name = catalogName($data);
        if (catalogNameTaken($conn, 'departments', $name, null)) {
            sendResponse(['error' => 'A department with this name already exists'], 409);
        }
        try {
            $stmt = $conn->prepare('INSERT INTO departments (name) VALUES (?)');
            $stmt->execute([$name]);
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'A department with this name already exists');
        }
        sendResponse(['ok' => true], 201);

    case 'dept_rename':
        $id   = positiveInt($data['id'] ?? null, 'Choose a department');
        $name = catalogName($data);
        catalogRequireRow($conn, 'departments', $id, 'Department not found');
        if (catalogNameTaken($conn, 'departments', $name, $id)) {
            sendResponse(['error' => 'A department with this name already exists'], 409);
        }
        try {
            $stmt = $conn->prepare('UPDATE departments SET name = ? WHERE id = ?');
            $stmt->execute([$name, $id]);
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'A department with this name already exists');
        }
        sendResponse(['ok' => true], 200);

    case 'dept_delete':
        $id = positiveInt($data['id'] ?? null, 'Choose a department');
        try {
            $conn->beginTransaction();

            // Lock the row so two admins cannot change it at the same moment.
            $lock = $conn->prepare('SELECT 1 FROM departments WHERE id = ? FOR UPDATE');
            $lock->execute([$id]);
            if ($lock->fetchColumn() === false) {
                catalogFail($conn, 404, 'Department not found');
            }

            $usage = [
                'requests'   => catalogCount($conn, 'SELECT COUNT(*) FROM requests WHERE department_id = ?', $id),
                'staff'      => catalogCount($conn, 'SELECT COUNT(*) FROM users WHERE department_id = ?', $id),
                'categories' => catalogCount($conn, 'SELECT COUNT(*) FROM categories WHERE default_department_id = ?', $id),
            ];

            if (array_sum($usage) > 0) {
                if (!isset($data['move_to_id'])) {
                    catalogFail($conn, 409,
                        'This department is in use. Choose where to move its requests, staff and categories.',
                        ['needs_move' => true, 'usage' => $usage]);
                }
                $target = positiveInt($data['move_to_id'], 'Choose where to move them');
                if ($target === $id) {
                    catalogFail($conn, 400, 'Choose a different department to move them to');
                }
                catalogRequireRow($conn, 'departments', $target, 'The department to move to was not found');

                $conn->prepare('UPDATE requests SET department_id = ? WHERE department_id = ?')
                     ->execute([$target, $id]);
                $conn->prepare('UPDATE users SET department_id = ? WHERE department_id = ?')
                     ->execute([$target, $id]);
                $conn->prepare('UPDATE categories SET default_department_id = ? WHERE default_department_id = ?')
                     ->execute([$target, $id]);
            }

            $conn->prepare('DELETE FROM departments WHERE id = ?')->execute([$id]);
            $conn->commit();
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'Could not delete the department');
        }
        sendResponse(['ok' => true], 200);

    case 'cat_create':
        $name   = catalogName($data);
        $deptId = positiveInt($data['default_department_id'] ?? null, 'Choose a default department');
        catalogRequireRow($conn, 'departments', $deptId, 'Department not found');
        if (catalogNameTaken($conn, 'categories', $name, null)) {
            sendResponse(['error' => 'A category with this name already exists'], 409);
        }
        try {
            $stmt = $conn->prepare('INSERT INTO categories (name, default_department_id) VALUES (?, ?)');
            $stmt->execute([$name, $deptId]);
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'A category with this name already exists');
        }
        sendResponse(['ok' => true], 201);

    case 'cat_rename':
        $id   = positiveInt($data['id'] ?? null, 'Choose a category');
        $name = catalogName($data);
        catalogRequireRow($conn, 'categories', $id, 'Category not found');
        if (catalogNameTaken($conn, 'categories', $name, $id)) {
            sendResponse(['error' => 'A category with this name already exists'], 409);
        }
        try {
            $stmt = $conn->prepare('UPDATE categories SET name = ? WHERE id = ?');
            $stmt->execute([$name, $id]);
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'A category with this name already exists');
        }
        sendResponse(['ok' => true], 200);

    case 'cat_delete':
        $id = positiveInt($data['id'] ?? null, 'Choose a category');
        try {
            $conn->beginTransaction();

            $lock = $conn->prepare('SELECT 1 FROM categories WHERE id = ? FOR UPDATE');
            $lock->execute([$id]);
            if ($lock->fetchColumn() === false) {
                catalogFail($conn, 404, 'Category not found');
            }

            $count = catalogCount($conn, 'SELECT COUNT(*) FROM requests WHERE category_id = ?', $id);
            if ($count > 0) {
                if (!isset($data['move_to_id'])) {
                    catalogFail($conn, 409,
                        'This category has requests. Choose a category to move them to.',
                        ['needs_move' => true, 'usage' => ['requests' => $count]]);
                }
                $target = positiveInt($data['move_to_id'], 'Choose where to move them');
                if ($target === $id) {
                    catalogFail($conn, 400, 'Choose a different category to move them to');
                }
                catalogRequireRow($conn, 'categories', $target, 'The category to move to was not found');

                $conn->prepare('UPDATE requests SET category_id = ? WHERE category_id = ?')
                     ->execute([$target, $id]);
            }

            $conn->prepare('DELETE FROM categories WHERE id = ?')->execute([$id]);
            $conn->commit();
        } catch (PDOException $e) {
            catalogWriteFailed($conn, $e, 'Could not delete the category');
        }
        sendResponse(['ok' => true], 200);

    default:
        sendResponse(['error' => 'Invalid action'], 400);
}
