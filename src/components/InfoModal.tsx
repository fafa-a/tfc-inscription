import { ModalCloseButton } from './ModalCloseButton';
import { ModalContent } from './ModalContent';

interface InfoModalProps {
  show: boolean;
  onClose: () => void;
  type: 'underage' | 'form-error' | 'success';
  formErrors?: string[];
  wasReturningMember?: boolean;
}

export const InfoModal: React.FC<InfoModalProps> = ({
  show,
  onClose,
  type,
  formErrors,
  wasReturningMember,
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative flex flex-col gap-4">
        <ModalCloseButton onClose={onClose} />
        <ModalContent
          onClose={onClose}
          type={type}
          formErrors={formErrors}
          wasReturningMember={wasReturningMember}
        />
      </div>
    </div>
  );
};
