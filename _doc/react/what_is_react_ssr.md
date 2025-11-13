## Qu'est-ce que React SSR ?

Jopi utilise une technique nommée React SSR. Afin de comprendre ce que c'est voici le déroulement d'une requête.

1. Le serveur reçoit une requête GET.
2. En interne il monte un composant React correpondant au rendu visuel de notre page web.
3. Il transforme ce composant React en du HTML pure, sans écouteur d'événements.
4. Le navigateur reçoit et affiche ce HTML.
5. Une fois les dépendances javascript chargées, le navigateur monte le composant React.
6. Il remplace le HTML par ce composant React : l'un et l'autre ayant un rendu complètement identique, le visiteur ne voit aucune différence.

Cette technique a plusieurs avantages:
- Le HTML généré, est indexable par les moteurs de recherche puis qu'il s'agit de HTML décrivant un visuel parfaitement identique à ce que vos composants React doivent montrer.
- Le visiteur de votre site, voit une page s'afficher très rapidement. Même si il s'agit du premier rendu et que les dépendances mettent du temps à charger.
- Vous utilisez React pour créer le HTML de votre site, ce qui signifie utiliser un système de composants ayant fait ses preuves en terme de gain de temps.

## C'est une fonctionnalité native avec Jopi

Avec Jopi Rewrite, l'usage de React SSR est un élément fondamental. C'est pourquoi vous n'avez rien de particulier à faire pour activer cette fonctionnalité.
## Une intégration ultra-rapide

Jopi Rewrite diffère des outils tel que Vite.js et Next.js par le fait qu'il n'y a pas de phase de compilation ou d'optimisation préalable. Les compilations se font page par page au moment de la première demande, et cela en moins d'un dixième de seconde. C'est pourquoi avec Jopi Rewrite, souvent redémarrer le serveur afin de faire des tests n'est pas un problème.