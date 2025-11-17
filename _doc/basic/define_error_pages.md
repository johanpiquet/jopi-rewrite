# Pages 401, 404 et 500

Vous pouvez définir une page à afficher lorsqu'une erreur 404 (not found) ou 500 (server error) survient. Pour cela, il suffit de créer un page error404 `@routes/error404/page.tsx` et une page error500 `@routes/error404/page.tsx`. Il en va de même pour l'erreur 401 (not authorized) avec une page error401 `@routes/error404/page.tsx`.

A savoir:
* L'erreur 404 est mise en cache dans un cache à accès immédiat. Elle ne peut donc pas être personnalisée.
* Ces pages ne sont renvoyées que pour une requête GET, avec une réponse HTML attendue. Pour une API, une simple réponse avec le code d'erreur est renvoyé.

