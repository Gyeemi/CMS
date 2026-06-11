type ErrorLike = {
  message?: string;
  details?: string;
  hint?: string;
};

export function getSupabaseErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'object' && error) {
    const err = error as ErrorLike;
    if (err.message) return err.message;
    if (err.details) return err.details;
    if (err.hint) return err.hint;
  }

  return fallback;
}
