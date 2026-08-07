interface ModalContentProps {
  onClose: () => void;
  type: 'underage' | 'form-error' | 'success';
  formErrors?: string[];
  wasReturningMember?: boolean;
}

export const ModalContent: React.FC<ModalContentProps> = ({
  onClose,
  type,
  formErrors,
  wasReturningMember,
}) => {
  if (type === 'success') {
    return (
      <>
        <h3 className="text-lg font-semibold text-green-700 dark:text-green-400 w-full text-left">
          {wasReturningMember ? 'Réinscription réussie' : 'Inscription réussie'}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 w-full text-left">
          Votre demande a été enregistrée avec succès.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors"
        >
          Fermer
        </button>
      </>
    );
  }

  if (type === 'form-error') {
    return (
      <>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 w-full text-left">
          Erreurs du formulaire
        </h3>
        <ul className="text-left text-gray-700 dark:text-gray-300 space-y-1 w-full list-disc list-inside">
          {formErrors?.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors"
        >
          Fermer
        </button>
      </>
    );
  }

  // Underage content (default)
  return (
    <>
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 w-full text-left">
        Inscription en personne requise
      </h3>
      <p className="text-gray-700 dark:text-gray-300 w-full text-left">
        L&apos;inscription en ligne est réservée aux adultes (16 ans et plus).
      </p>
      <p className="text-gray-700 dark:text-gray-300 w-full text-left">
        Pour inscrire un enfant ou un adolescent, veuillez vous présenter directement à l'accueil du
        club.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-2 w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-md transition-colors"
      >
        Fermer
      </button>
    </>
  );
};
