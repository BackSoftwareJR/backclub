<?php
// Redirect to the frontend application
// Assuming the frontend build files are located in 'frontend/dist'
// or the user uploads 'frontend/dist' contents to 'public_html' and this index.php is not needed.
// However, if the structure is kept as is:
header("Location: frontend/dist/index.html");
exit;
