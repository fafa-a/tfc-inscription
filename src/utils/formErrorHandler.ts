import { z } from 'zod';

interface FormErrorCallbacks {
  setFormErrorMessages: (msgs: string[]) => void;
  setShowFormErrorModal: (show: boolean) => void;
  focusFirstErrorField: (fieldNames: string[]) => void;
  setSubmitError: (msg: string | null) => void;
}

export function handleFormValidationError(
  error: Error | z.ZodError | unknown,
  callbacks: FormErrorCallbacks
): void {
  if (error instanceof z.ZodError) {
    // Extract error messages from Zod validation
    const errors = error.issues.map((issue) => issue.message);
    const fieldNames = error.issues.map((issue) => String(issue.path[0]));
    callbacks.setFormErrorMessages(errors);
    callbacks.setShowFormErrorModal(true);
    callbacks.focusFirstErrorField(fieldNames);
  } else {
    // Other errors (photo upload, DB, etc.)
    const errorMessage =
      error instanceof Error ? error.message : "Une erreur est survenue lors de l'inscription";
    callbacks.setSubmitError(errorMessage);
  }
}
