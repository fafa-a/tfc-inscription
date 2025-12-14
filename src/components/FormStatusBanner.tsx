interface FormStatusBannerProps {
  showNewMemberInfo: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  showReturningMemberBanner: boolean;
  wasReturningMember: boolean;
}

export function FormStatusBanner({
  showNewMemberInfo,
  submitSuccess,
  submitError,
  showReturningMemberBanner,
  wasReturningMember,
}: FormStatusBannerProps) {
  return (
    <>
      {showNewMemberInfo && (
        <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
          <p className="text-purple-800 dark:text-purple-200 text-sm">
            💡 <strong>Anciens membres :</strong> Commencez par renseigner votre email pour
            pré-remplir vos informations
          </p>
        </div>
      )}

      {submitSuccess && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✓ {wasReturningMember ? 'Réinscription' : 'Inscription'} réussie ! Votre demande a été
            enregistrée.
          </p>
        </div>
      )}

      {submitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">✗ {submitError}</p>
        </div>
      )}

      {showReturningMemberBanner && (
        <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-800 dark:text-blue-200 font-medium">
            i Ancien membre détecté - Veuillez vérifier vos informations et télécharger une nouvelle
            photo d'identité pour votre réinscription
          </p>
        </div>
      )}
    </>
  );
}
