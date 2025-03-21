/**
 * Shim pour la fonction use() de React qui n'est pas disponible dans React 18.2.0
 * Cette fonction remplace temporairement l'implémentation manquante pour permettre la compilation
 */
export function use<T>(promise: Promise<T> | T): T {
  if (promise instanceof Promise) {
    throw new Error("La fonction use() pour les promesses n'est pas disponible dans cette version de React");
  }
  return promise;
} 