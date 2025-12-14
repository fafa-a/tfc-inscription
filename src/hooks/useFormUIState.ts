import { useMemo, useRef, useState } from 'react';

interface UseFormUIStateParams {
  isReturningMember: boolean;
  currentBirthday: string;
  isUnderageUser: boolean;
  builderDiscipline: string;
  currentSubscription: { price: number } | null;
}

export function useFormUIState({
  isReturningMember,
  currentBirthday,
  isUnderageUser,
  builderDiscipline,
  currentSubscription,
}: UseFormUIStateParams) {
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Modal States
  const [showFormErrorModal, setShowFormErrorModal] = useState(false);
  const [formErrorMessages, setFormErrorMessages] = useState<string[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Photo State
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);

  // Computed flags
  const canShowBuilder = useMemo(
    () => currentBirthday && !isUnderageUser,
    [currentBirthday, isUnderageUser]
  );

  const canShowNoBirthdayMessage = useMemo(() => !currentBirthday, [currentBirthday]);

  const showSubmitWarning = useMemo(
    () => !currentSubscription && currentBirthday && !isUnderageUser,
    [currentSubscription, currentBirthday, isUnderageUser]
  );

  const canSubmit = useMemo(() => !isUnderageUser, [isUnderageUser]);

  const isSubmitDisabled = useMemo(
    () => isSubmitting || !currentSubscription,
    [isSubmitting, currentSubscription]
  );

  const showReturningMemberBanner = useMemo(
    () => isReturningMember && !submitSuccess,
    [isReturningMember, submitSuccess]
  );

  const showNewMemberInfo = useMemo(
    () => !isReturningMember && !submitSuccess,
    [isReturningMember, submitSuccess]
  );

  const showTemporalitySelector = useMemo(() => !!builderDiscipline, [builderDiscipline]);

  return {
    // States
    isSubmitting,
    setIsSubmitting,
    submitError,
    setSubmitError,
    submitSuccess,
    setSubmitSuccess,
    showFormErrorModal,
    setShowFormErrorModal,
    formErrorMessages,
    setFormErrorMessages,
    showSuccessModal,
    setShowSuccessModal,
    photoPreview,
    setPhotoPreview,
    photoPreviewRef,

    // Computed flags
    canShowBuilder,
    canShowNoBirthdayMessage,
    showSubmitWarning,
    canSubmit,
    isSubmitDisabled,
    showReturningMemberBanner,
    showNewMemberInfo,
    showTemporalitySelector,
  };
}
