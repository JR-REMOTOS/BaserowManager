<?php
session_start();

<<<<<<< HEAD
if (!isset($_SESSION['user'])) {
=======
if (!isset($_SESSION['user_id'])) {
>>>>>>> 21173c1 (Alterações falta Arrumar Mapeamento)
    header('Location: login.html');
    exit;
}
?>
