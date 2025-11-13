
# Importer une CSS

Dans un fichier de route `page.tsx` lorsque vous importez une fichier CSS, ou SCSS (Sass) alors ce fichier CSS est inclut par le HTML de la page après avoir été minimisé.

```
import "./mystyle-1.css";  
import "./mystyle-2.scss";
```

Le CSS référencé est inclut uniquement par les pages important cette CSS : il n'y a pas de bundle global. Si vous désirez en créer un, il suffit d'avoir un fichier commun important plusieurs CSS.
