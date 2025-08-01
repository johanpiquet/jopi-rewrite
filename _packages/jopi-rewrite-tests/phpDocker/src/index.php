<?php
echo "<h1>Bonjour depuis PHP 8.3 ! B</h1>";

// Test de connexion à la base de données MySQL
$servername = "mysql"; // Le nom du service MySQL dans docker-compose
$username = 'mysql_user';
$password = 'mysql_user_password';
$dbname = 'mysql_database';

// Création de la connexion
$conn = new mysqli($servername, $username, $password, $dbname);

// Vérification de la connexion
if ($conn->connect_error) {
    die("La connexion à la base de données a échoué : " . $conn->connect_error);
}
echo "<p>Connexion à MySQL réussie !</p>";

// Exemple de requête simple (création d'une table si elle n'existe pas)
$sql = "CREATE TABLE IF NOT EXISTS messages (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    message VARCHAR(255) NOT NULL,
    reg_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
)";

if ($conn->query($sql) === TRUE) {
    echo "<p>Table 'messages' vérifiée/créée avec succès.</p>";
} else {
    echo "<p>Erreur lors de la création de la table : " . $conn->error . "</p>";
}

$conn->close();

phpinfo(); // Affiche les informations de configuration PHP (à retirer en production)
?>