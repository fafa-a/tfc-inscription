import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { FormStatusBanner } from './components/FormStatusBanner';
import { InfoModal } from './components/InfoModal';
import { SubscriptionBuilderSection } from './components/SubscriptionBuilderSection';
import { SubscriptionSummary } from './components/SubscriptionSummary';
import { audienceLabels, temporalityLabels } from './constants/labels';
import { genderMap, reverseGenderMap } from './constants/mappings';
import { useFormUIState } from './hooks/useFormUIState';
import { useSubscriptionBuilder } from './hooks/useSubscriptionBuilder';
import { useUnderagePolicy } from './hooks/useUnderagePolicy';
import {
  type Discipline,
  type SubscriptionPlan,
  checkMemberByEmail,
  convertToISODate,
  insertMemberWithSubscriptions,
  supabase,
} from './lib/supabase';
import { handleFormValidationError } from './utils/formErrorHandler';
import { formatDateInput } from './utils/formatDateInput';
import { uploadIdentityPhoto, validateImageFile } from './utils/uploadPhoto';

const formSchema = z.object({
  firstname: z
    .string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .refine((val) => !/\d/.test(val), {
      message: 'Le prénom ne doit pas contenir de chiffres',
    }),
  lastname: z
    .string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .refine((val) => !/\d/.test(val), {
      message: 'Le nom ne doit pas contenir de chiffres',
    }),
  birthday: z
    .string()
    .min(1, 'La date de naissance est requise')
    .refine(
      (val) => {
        const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
        return dateRegex.test(val);
      },
      {
        message: 'Format de date invalide (JJ/MM/AAAA)',
      }
    ),
  genre: z.enum(['homme', 'femme'], {
    message: 'Veuillez sélectionner un genre',
  }),
  phone: z
    .string()
    .length(10, 'Le numéro de téléphone doit contenir 10 chiffres')
    .regex(/^[0-9]+$/, 'Le numéro doit contenir uniquement des chiffres'),
  urgencyPhone: z
    .string()
    .length(10, "Le numéro d'urgence doit contenir 10 chiffres")
    .regex(/^[0-9]+$/, 'Le numéro doit contenir uniquement des chiffres'),
  email: z.email('Adresse email invalide'),
  identityPhoto: z.instanceof(File, { message: "La photo d'identité est requise" }).refine(
    (file) => {
      const validation = validateImageFile(file);
      return validation.valid;
    },
    {
      message: 'Veuillez sélectionner une photo valide',
    }
  ),
});

type FormData = z.infer<typeof formSchema>;

export default function InscriptionForm() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [currentBirthday, setCurrentBirthday] = useState('');

  // Member detection state
  const [isReturningMember, setIsReturningMember] = useState(false);
  const [existingMemberData, setExistingMemberData] = useState<{
    id: string;
    first_name: string;
    last_name: string;
    birth_date: string;
    gender: 'male' | 'female';
    phone: string;
    emergency_phone: string;
  } | null>(null);
  const [wasReturningMember, setWasReturningMember] = useState(false);

  // Adults-only policy state (using hook)
  const { isUnderageUser, showUnderageModal, checkAge, closeModal } = useUnderagePolicy();

  // Subscription builder state (using hook)
  const {
    builderDiscipline,
    builderTemporality,
    availableTemporalities,
    getSelectedPlan,
    setBuilderDiscipline,
    setBuilderTemporality,
    resetBuilder,
  } = useSubscriptionBuilder({
    currentBirthday,
    isReturningMember,
    subscriptionPlans,
  });

  // Get current selected subscription plan
  const currentSubscription = useMemo(() => {
    const plan = getSelectedPlan();
    if (!plan) return null;

    const discipline = disciplines.find((d) => d.id === builderDiscipline);
    return {
      planId: plan.id,
      disciplineId: builderDiscipline,
      disciplineName: discipline?.name || '',
      duration: plan.duration,
      price: plan.price,
      audience: plan.audience,
    };
  }, [getSelectedPlan, disciplines, builderDiscipline]);

  // UI state (using hook)
  const {
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
    canShowBuilder,
    canShowNoBirthdayMessage,
    showSubmitWarning,
    canSubmit,
    isSubmitDisabled,
    showReturningMemberBanner,
    showNewMemberInfo,
    showTemporalitySelector,
  } = useFormUIState({
    isReturningMember,
    currentBirthday,
    isUnderageUser,
    builderDiscipline,
    currentSubscription,
  });

  // Refs for form fields (used for focus on validation errors)
  const firstnameRef = useRef<HTMLInputElement | null>(null);
  const lastnameRef = useRef<HTMLInputElement | null>(null);
  const birthdayRef = useRef<HTMLInputElement | null>(null);
  const genreRef = useRef<HTMLSelectElement | null>(null);
  const phoneRef = useRef<HTMLInputElement | null>(null);
  const urgencyPhoneRef = useRef<HTMLInputElement | null>(null);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const identityPhotoRef = useRef<HTMLInputElement | null>(null);

  const fieldRefMap = useRef({
    firstname: firstnameRef,
    lastname: lastnameRef,
    birthday: birthdayRef,
    genre: genreRef,
    phone: phoneRef,
    urgencyPhone: urgencyPhoneRef,
    email: emailRef,
    identityPhoto: identityPhotoRef,
  });

  useEffect(() => {
    const fetchData = async () => {
      await supabase.auth.signOut();

      const { data: disciplinesData, error: disciplinesError } = await supabase
        .from('disciplines')
        .select('id, name')
        .eq('active', true);

      if (!disciplinesError && disciplinesData) {
        setDisciplines(disciplinesData);
      }

      const { data: plansData, error: plansError } = await supabase
        .from('subscription_plans')
        .select('id, duration, price, discipline_id, audience, active')
        .eq('active', true);

      if (!plansError && plansData) {
        const mappedPlans: SubscriptionPlan[] = plansData.map((plan) => ({
          ...plan,
          type: plan.duration,
          name: '',
        }));
        setSubscriptionPlans(mappedPlans);
      }
    };

    fetchData();
  }, []);

  // Close all modals (underage + form errors + success)
  const closeAllModals = useCallback(() => {
    closeModal(); // Close underage modal
    setShowFormErrorModal(false); // Close form error modal
    setFormErrorMessages([]);
    setShowSuccessModal(false); // Close success modal
  }, [closeModal, setShowFormErrorModal, setFormErrorMessages, setShowSuccessModal]);

  // Focus and scroll to first error field
  const focusFirstErrorField = useCallback((fieldNames: string[]) => {
    for (const fieldName of fieldNames) {
      const ref = fieldRefMap.current[fieldName as keyof typeof fieldRefMap.current];
      const inputElement = ref?.current;
      if (inputElement) {
        inputElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(() => inputElement.focus(), 300); // Wait for scroll to finish
        break;
      }
    }
  }, []);

  // Extract submit handler to reduce complexity
  const handleFormSubmission = useCallback(
    async (value: unknown) => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        const selectedPlan = getSelectedPlan();
        if (!selectedPlan) {
          throw new Error('Veuillez choisir une discipline et une durée');
        }

        const validated = formSchema.parse(value);
        const birthDateISO = convertToISODate(validated.birthday);

        const memberData = {
          first_name: validated.firstname,
          last_name: validated.lastname,
          birth_date: birthDateISO,
          gender: genderMap[validated.genre],
          phone: validated.phone,
          emergency_phone: validated.urgencyPhone,
          email: validated.email,
          notes: 'Inscription web',
        };

        const planIds = [selectedPlan.id];
        const memberId = existingMemberData?.id || crypto.randomUUID();

        const photoUploadResult = await uploadIdentityPhoto(validated.identityPhoto, memberId);
        if (!photoUploadResult.success) {
          throw new Error(photoUploadResult.error || "Erreur lors de l'upload de la photo");
        }

        const result = await insertMemberWithSubscriptions(
          memberData,
          planIds,
          photoUploadResult.path || ''
        );
        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'inscription");
        }

        setSubmitSuccess(true);
        setWasReturningMember(isReturningMember);
        setShowSuccessModal(true); // Show success modal
        setCurrentBirthday('');
        resetBuilder();
        setPhotoPreview(null);
        setIsReturningMember(false);
        setExistingMemberData(null);
        closeModal();
      } catch (error) {
        handleFormValidationError(error, {
          setFormErrorMessages,
          setShowFormErrorModal,
          focusFirstErrorField,
          setSubmitError,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      getSelectedPlan,
      existingMemberData,
      isReturningMember,
      resetBuilder,
      closeModal,
      focusFirstErrorField,
      setIsSubmitting,
      setSubmitError,
      setSubmitSuccess,
      setShowSuccessModal,
      setPhotoPreview,
      setFormErrorMessages,
      setShowFormErrorModal,
    ]
  );

  const form = useForm({
    defaultValues: {
      firstname: '',
      lastname: '',
      birthday: '',
      genre: '' as FormData['genre'] | '',
      phone: '',
      urgencyPhone: '',
      email: '',
      identityPhoto: undefined as File | undefined,
    },
    onSubmit: async ({ value }) => {
      await handleFormSubmission(value);
      form.reset();
    },
    onSubmitInvalid: ({ formApi }) => {
      const allErrors = formApi.getAllErrors();
      const fieldNames: (keyof FormData)[] = [
        'firstname',
        'lastname',
        'birthday',
        'genre',
        'phone',
        'urgencyPhone',
        'email',
        'identityPhoto',
      ];

      const fieldErrorMessages: string[] = [];
      const fieldNamesWithErrors: string[] = [];

      for (const fieldName of fieldNames) {
        const fieldError = allErrors.fields[fieldName];
        if (fieldError && fieldError.errors.length > 0) {
          fieldNamesWithErrors.push(fieldName);
          for (const error of fieldError.errors) {
            if (typeof error === 'string') {
              fieldErrorMessages.push(error);
            }
          }
        }
      }

      if (fieldErrorMessages.length > 0) {
        setFormErrorMessages(fieldErrorMessages);
        setShowFormErrorModal(true);
        focusFirstErrorField(fieldNamesWithErrors);
      }
    },
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      void form.handleSubmit();
    },
    [form]
  );

  // Handle modal close with birthday reset for underage modal
  const handleModalClose = useCallback(() => {
    // If underage modal is open, reset birthday field
    if (showUnderageModal) {
      form.setFieldValue('birthday', '');
      setCurrentBirthday('');
    }

    // Close all modals
    closeAllModals();
  }, [showUnderageModal, form, closeAllModals]);

  const createTextChangeHandler = useCallback(
    <T,>(handleChange: (value: T) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        handleChange(e.target.value as T);
      },
    []
  );

  const createSelectChangeHandler = useCallback(
    <T,>(handleChange: (value: T) => void) =>
      (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleChange(e.target.value as T);
      },
    []
  );

  const handleBirthdayChange = useCallback(
    (fieldHandleChange: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value, form.getFieldValue('birthday'));
      fieldHandleChange(formatted);
      setCurrentBirthday(formatted);

      // Check if user is underage (adults only policy)
      checkAge(formatted);
    },
    [form, checkAge]
  );

  const handleEmailBlur = useCallback(
    (fieldHandleBlur: () => void) => async () => {
      const email = form.getFieldValue('email');
      fieldHandleBlur(); // Call form's blur handler first

      if (!email || !z.string().email().safeParse(email).success) {
        return; // Don't check if email is invalid
      }

      try {
        const result = await checkMemberByEmail(email);

        if (result.exists && result.memberData) {
          setIsReturningMember(true);
          setExistingMemberData(result.memberData);

          // Pre-fill form fields
          form.setFieldValue('firstname', result.memberData.first_name);
          form.setFieldValue('lastname', result.memberData.last_name);
          form.setFieldValue('phone', result.memberData.phone);
          form.setFieldValue('urgencyPhone', result.memberData.emergency_phone);
          const mappedGender = reverseGenderMap[result.memberData.gender as 'male' | 'female'];
          if (mappedGender) {
            form.setFieldValue('genre', mappedGender);
          }

          // Convert birth_date from YYYY-MM-DD to DD/MM/YYYY
          const [year, month, day] = result.memberData.birth_date.split('-');
          const formattedBirthday = `${day}/${month}/${year}`;
          form.setFieldValue('birthday', formattedBirthday);
          setCurrentBirthday(formattedBirthday);

          // Check if returning member is underage (adults only policy)
          checkAge(formattedBirthday);
        } else {
          setIsReturningMember(false);
          setExistingMemberData(null);
        }
      } catch (error) {
        // Silently fail - don't block form submission
        setIsReturningMember(false);
        setExistingMemberData(null);
      }
    },
    [form, checkAge]
  );

  // Cleanup photo preview URL on unmount
  useEffect(() => {
    return () => {
      if (photoPreviewRef.current) {
        URL.revokeObjectURL(photoPreviewRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePhotoChange = useCallback(
    (handleChange: (value: File | undefined) => void) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
          // Revoke previous preview URL to prevent memory leak
          if (photoPreviewRef.current) {
            URL.revokeObjectURL(photoPreviewRef.current);
          }
          handleChange(file);
          const previewUrl = URL.createObjectURL(file);
          photoPreviewRef.current = previewUrl;
          setPhotoPreview(previewUrl);
        } else {
          // Cleanup when file is removed
          if (photoPreviewRef.current) {
            URL.revokeObjectURL(photoPreviewRef.current);
            photoPreviewRef.current = null;
          }
          handleChange(undefined);
          setPhotoPreview(null);
        }
      },
    [photoPreviewRef, setPhotoPreview]
  );

  const handleDisciplineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuilderDiscipline(e.target.value);
    },
    [setBuilderDiscipline]
  );

  const handleTemporalityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setBuilderTemporality(e.target.value);
    },
    [setBuilderTemporality]
  );

  // Disabled field styling for returning members
  const disabledFieldClass = isReturningMember
    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
    : '';

  const totalPrice = currentSubscription?.price || 0;

  return (
    <>
      {/* Modal for underage users, form errors, or success */}
      <InfoModal
        show={showUnderageModal || showFormErrorModal || showSuccessModal}
        onClose={handleModalClose}
        type={showSuccessModal ? 'success' : showFormErrorModal ? 'form-error' : 'underage'}
        formErrors={formErrorMessages}
        wasReturningMember={wasReturningMember}
      />

      <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
          Formulaire d'inscription
        </h2>

        <FormStatusBanner
          showNewMemberInfo={showNewMemberInfo}
          submitSuccess={submitSuccess}
          submitError={submitError}
          showReturningMemberBanner={showReturningMemberBanner}
          wasReturningMember={wasReturningMember}
        />

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <form.Field
            name="firstname"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.firstname.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="firstname"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Prénom *
                </label>
                <input
                  id="firstname"
                  ref={firstnameRef}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={createTextChangeHandler(field.handleChange)}
                  disabled={isReturningMember}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${disabledFieldClass}`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="lastname"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.lastname.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="lastname"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Nom *
                </label>
                <input
                  id="lastname"
                  ref={lastnameRef}
                  type="text"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={createTextChangeHandler(field.handleChange)}
                  disabled={isReturningMember}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${disabledFieldClass}`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="birthday"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.birthday.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="birthday"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Date de naissance *
                </label>
                <input
                  id="birthday"
                  ref={birthdayRef}
                  type="text"
                  placeholder="JJ/MM/AAAA"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={handleBirthdayChange(field.handleChange)}
                  disabled={isReturningMember}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${disabledFieldClass}`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="genre"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.genre.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="genre"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Genre *
                </label>
                <select
                  id="genre"
                  ref={genreRef}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={createSelectChangeHandler(field.handleChange)}
                  disabled={isReturningMember}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${disabledFieldClass}`}
                >
                  <option value="">Sélectionner...</option>
                  <option value="homme">Homme</option>
                  <option value="femme">Femme</option>
                </select>
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="phone"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.phone.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Téléphone *
                </label>
                <input
                  id="phone"
                  ref={phoneRef}
                  type="tel"
                  placeholder="0612345678"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={createTextChangeHandler(field.handleChange)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="urgencyPhone"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.urgencyPhone.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="urgencyPhone"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Téléphone d'urgence *
                </label>
                <input
                  id="urgencyPhone"
                  ref={urgencyPhoneRef}
                  type="tel"
                  placeholder="0612345678"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={createTextChangeHandler(field.handleChange)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="email"
            validators={{
              onChange: ({ value }) => {
                const result = formSchema.shape.email.safeParse(value);
                if (!result.success) {
                  return result.error.issues[0]?.message;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Email *
                </label>
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  placeholder="exemple@email.com"
                  value={field.state.value}
                  onBlur={handleEmailBlur(field.handleBlur)}
                  onChange={createTextChangeHandler(field.handleChange)}
                  disabled={isReturningMember}
                  className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white ${disabledFieldClass}`}
                />
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          <form.Field
            name="identityPhoto"
            validators={{
              onChange: ({ value }) => {
                if (!value) {
                  return "La photo d'identité est requise";
                }
                const validation = validateImageFile(value);
                if (!validation.valid) {
                  return validation.error;
                }
                return undefined;
              },
            }}
          >
            {(field) => (
              <div>
                <label
                  htmlFor="identityPhoto"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Photo d'identité *
                </label>
                <input
                  id="identityPhoto"
                  ref={identityPhotoRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  required
                  onChange={handlePhotoChange(field.handleChange)}
                  onBlur={field.handleBlur}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 dark:file:bg-purple-900 dark:file:text-purple-200 ${
                    field.state.meta.errors.length > 0
                      ? 'border-red-500 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Formats acceptés : <strong>JPEG ou PNG uniquement</strong>. Taille max : 1 Mo
                </p>
                {photoPreview && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Aperçu :</p>
                    <img
                      src={photoPreview}
                      alt="Aperçu de l'identité sélectionnée"
                      className="w-32 h-32 object-cover rounded-lg border-2 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                )}
                {field.state.meta.errors.length > 0 && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                    {field.state.meta.errors.join(', ')}
                  </p>
                )}
              </div>
            )}
          </form.Field>

          {/* Selected Subscriptions Summary */}
          {currentSubscription && (
            <SubscriptionSummary
              disciplineName={currentSubscription.disciplineName}
              duration={
                temporalityLabels[currentSubscription.duration] || currentSubscription.duration
              }
              audience={
                audienceLabels[currentSubscription.audience] || currentSubscription.audience
              }
              price={currentSubscription.price}
              totalPrice={totalPrice}
            />
          )}

          {/* Subscription Builder - Hidden for underage users (adults only policy) */}
          {canShowBuilder && (
            <SubscriptionBuilderSection
              disciplines={disciplines}
              builderDiscipline={builderDiscipline}
              builderTemporality={builderTemporality}
              availableTemporalities={availableTemporalities}
              showTemporalitySelector={showTemporalitySelector}
              handleDisciplineChange={handleDisciplineChange}
              handleTemporalityChange={handleTemporalityChange}
            />
          )}

          {canShowNoBirthdayMessage && (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                Veuillez renseigner votre date de naissance pour ajouter des abonnements
              </p>
            </div>
          )}

          <div className="pt-4">
            {showSubmitWarning && (
              <p
                id="subscription-warning"
                className="mb-3 text-sm text-amber-600 dark:text-amber-400 text-center"
              >
                Veuillez choisir une discipline et une durée pour continuer
              </p>
            )}
            {/* Hide submit button for underage users (adults only policy) */}
            {canSubmit && (
              <button
                type="submit"
                disabled={isSubmitDisabled}
                aria-disabled={isSubmitDisabled}
                aria-busy={isSubmitting}
                aria-describedby={!currentSubscription ? 'subscription-warning' : undefined}
                className="w-full px-6 py-3 text-base font-medium text-white bg-purple-600 hover:bg-purple-700 active:translate-y-0.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
              >
                {isSubmitting ? 'Inscription en cours...' : "S'inscrire"}
              </button>
            )}
          </div>
        </form>
      </div>
    </>
  );
}
