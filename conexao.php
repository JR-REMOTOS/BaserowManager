<?php
<<<<<<< HEAD
require_once 'config.php';

$conn = new mysqli(DB_HOST, DB_USER, DB_PASSWORD, DB_NAME);

if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
=======
try {
    $conn = new PDO('sqlite:database.sqlite');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
    die();
>>>>>>> 21173c1 (Alterações falta Arrumar Mapeamento)
}
?>
