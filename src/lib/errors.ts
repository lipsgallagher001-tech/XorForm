/**
 * Système de gestion d'erreurs pour XorForm
 */

export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public userMessage: string,
    public details?: any
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  // Authentification
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_USER_NOT_FOUND: 'AUTH_USER_NOT_FOUND',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  
  // Base de données
  DB_CONNECTION_FAILED: 'DB_CONNECTION_FAILED',
  DB_QUERY_FAILED: 'DB_QUERY_FAILED',
  DB_TABLE_NOT_FOUND: 'DB_TABLE_NOT_FOUND',
  DB_CONSTRAINT_VIOLATION: 'DB_CONSTRAINT_VIOLATION',
  
  // Validation
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  
  // Logique métier
  SAVE_FAILED: 'SAVE_FAILED',
  DELETE_FAILED: 'DELETE_FAILED',
  LOAD_FAILED: 'LOAD_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  
  // Réseau
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  
  // Général
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  PERMISSION_DENIED: 'PERMISSION_DENIED'
} as const;

export const ErrorMessages: Record<string, string> = {
  [ErrorCodes.AUTH_FAILED]: 'Échec de l\'authentification. Veuillez réessayer.',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Email ou mot de passe incorrect.',
  [ErrorCodes.AUTH_USER_NOT_FOUND]: 'Utilisateur non trouvé.',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Votre session a expiré. Veuillez vous reconnecter.',
  
  [ErrorCodes.DB_CONNECTION_FAILED]: 'Impossible de se connecter à la base de données. Vérifiez votre connexion internet.',
  [ErrorCodes.DB_QUERY_FAILED]: 'Erreur lors de l\'accès aux données.',
  [ErrorCodes.DB_TABLE_NOT_FOUND]: 'Table non trouvée. Veuillez contacter le support technique.',
  [ErrorCodes.DB_CONSTRAINT_VIOLATION]: 'Violation de contrainte de base de données.',
  
  [ErrorCodes.VALIDATION_FAILED]: 'Les données saisies sont invalides. Veuillez vérifier vos informations.',
  [ErrorCodes.INVALID_INPUT]: 'Données invalides.',
  [ErrorCodes.MISSING_REQUIRED_FIELD]: 'Champ requis manquant.',
  
  [ErrorCodes.SAVE_FAILED]: 'Impossible de sauvegarder. Vérifiez votre connexion et réessayez.',
  [ErrorCodes.DELETE_FAILED]: 'Impossible de supprimer. Veuillez réessayer.',
  [ErrorCodes.LOAD_FAILED]: 'Impossible de charger les données. Veuillez réessayer.',
  [ErrorCodes.UPDATE_FAILED]: 'Impossible de mettre à jour. Veuillez réessayer.',
  
  [ErrorCodes.NETWORK_ERROR]: 'Erreur réseau. Vérifiez votre connexion internet.',
  [ErrorCodes.TIMEOUT]: 'La requête a pris trop de temps. Veuillez réessayer.',
  
  [ErrorCodes.UNKNOWN_ERROR]: 'Une erreur inattendue est survenue.',
  [ErrorCodes.PERMISSION_DENIED]: 'Vous n\'avez pas les permissions nécessaires.'
};

/**
 * Crée une erreur applicative avec un code et un message utilisateur
 */
export function createError(
  code: string,
  details?: any
): AppError {
  const userMessage = ErrorMessages[code] || ErrorMessages[ErrorCodes.UNKNOWN_ERROR];
  return new AppError(
    `Error ${code}`,
    code,
    userMessage,
    details
  );
}

/**
 * Convertit une erreur inconnue en AppError
 */
export function handleError(error: unknown): AppError {
  // Si c'est déjà une AppError, la retourner
  if (error instanceof AppError) {
    return error;
  }
  
  // Si c'est une erreur standard
  if (error instanceof Error) {
    // Vérifier si c'est une erreur Supabase
    if ('code' in error) {
      const supabaseError = error as any;
      
      // Erreur de table non trouvée
      if (supabaseError.code === '42P01') {
        return createError(ErrorCodes.DB_TABLE_NOT_FOUND, {
          originalError: error,
          supabaseCode: supabaseError.code
        });
      }
      
      // Erreur de contrainte
      if (supabaseError.code === '23505' || supabaseError.code === '23503') {
        return createError(ErrorCodes.DB_CONSTRAINT_VIOLATION, {
          originalError: error,
          supabaseCode: supabaseError.code
        });
      }
    }
    
    // Erreur réseau
    if (error.message.includes('network') || error.message.includes('fetch')) {
      return createError(ErrorCodes.NETWORK_ERROR, {
        originalError: error
      });
    }
    
    // Erreur générique
    return new AppError(
      error.message,
      ErrorCodes.UNKNOWN_ERROR,
      'Une erreur inattendue est survenue',
      { originalError: error }
    );
  }
  
  // Erreur complètement inconnue
  return new AppError(
    'Unknown error',
    ErrorCodes.UNKNOWN_ERROR,
    'Une erreur inattendue est survenue',
    { error }
  );
}

/**
 * Formate les erreurs de validation Zod pour l'affichage
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function formatValidationErrors(errors: Array<{ path: any[]; message: string }>): string {
  return errors
    .map(err => {
      const field = err.path.map(String).join('.');
      return field ? `${field}: ${err.message}` : err.message;
    })
    .join('\n');
}
