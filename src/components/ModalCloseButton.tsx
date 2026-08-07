interface ModalCloseButtonProps {
  onClose: () => void;
}

export const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ onClose }) => (
  <button
    type="button"
    onClick={onClose}
    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
    aria-label="Fermer"
  >
    <svg
      className="w-6 h-6"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
    >
      <title>Fermer</title>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
);
