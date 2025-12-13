import { useCallback, useState } from 'react';
import { getAgeGroupFromBirthday } from '../utils/ageUtils';

export function useUnderagePolicy() {
  const [isUnderageUser, setIsUnderageUser] = useState(false);
  const [showUnderageModal, setShowUnderageModal] = useState(false);

  const checkAge = useCallback((birthday: string) => {
    const ageGroup = getAgeGroupFromBirthday(birthday);
    const isUnderage = ageGroup === 'enfant' || ageGroup === 'ado';

    setIsUnderageUser(isUnderage);
    if (isUnderage) {
      setShowUnderageModal(true);
    }
  }, []);

  const closeModal = useCallback(() => {
    setShowUnderageModal(false);
    setIsUnderageUser(false);
  }, []);

  const resetAge = useCallback(() => {
    setIsUnderageUser(false);
    setShowUnderageModal(false);
  }, []);

  return {
    isUnderageUser,
    showUnderageModal,
    checkAge,
    closeModal,
    resetAge,
  };
}
