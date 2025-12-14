import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { SubscriptionBuilderSection } from './components/SubscriptionBuilderSection';
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
import { uploadIdentityPhoto, validateImageFile } from './utils/uploadPhoto';

const formatDateInput = (value: string, previousValue: string): string => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 8);
  const isDeleting = value.length < previousValue.length;

  if (limitedDigits.length >= 4) {
    const formatted = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2, 4)}/${limitedDigits.slice(4)}`;
    return formatted;
  }
  if (limitedDigits.length >= 2 && !isDeleting) {
    const formatted = `${limitedDigits.slice(0, 2)}/${limitedDigits.slice(2)}`;
    return formatted;
  }
  return limitedDigits;
};

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

// Modal close button component
interface ModalCloseButtonProps {
  onClose: () => void;
}

const ModalCloseButton: React.FC<ModalCloseButtonProps> = ({ onClose }) => (
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

// Modal content component
interface ModalContentProps {
  onClose: () => void;
}

const ModalContent: React.FC<ModalContentProps> = ({ onClose }) => (
  <>
    <span className="text-5xl">⚠️</span>
    <h3 className="text-xl font-bold text-orange-600 dark:text-orange-400">
      Inscription en personne requise
    </h3>
    <p className="text-gray-700 dark:text-gray-300">
      L'inscription en ligne est réservée aux adultes (16 ans et plus).
    </p>
    <p className="text-gray-700 dark:text-gray-300">
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

// Underage modal component
interface UnderageModalProps {
  show: boolean;
  onClose: () => void;
}

const UnderageModal: React.FC<UnderageModalProps> = ({ show, onClose }) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative flex flex-col items-center text-center gap-4">
        <ModalCloseButton onClose={onClose} />
        <ModalContent onClose={onClose} />
      </div>
    </div>
  );
};

export default function InscriptionForm() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentBirthday, setCurrentBirthday] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const photoPreviewRef = useRef<string | null>(null);

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

        const genderMap: Record<'homme' | 'femme', 'male' | 'female'> = {
          homme: 'male',
          femme: 'female',
        };

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
        setCurrentBirthday('');
        resetBuilder();
        setPhotoPreview(null);
        setIsReturningMember(false);
        setExistingMemberData(null);
        closeModal();
      } catch (error) {
        const errorMessage =
          error instanceof z.ZodError
            ? 'Veuillez vérifier tous les champs du formulaire'
            : error instanceof Error
              ? error.message
              : "Une erreur est survenue lors de l'inscription";
        setSubmitError(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [getSelectedPlan, existingMemberData, isReturningMember, resetBuilder, closeModal]
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
  });

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

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
          const genderMap: Record<'male' | 'female', 'homme' | 'femme'> = {
            male: 'homme',
            female: 'femme',
          };

          form.setFieldValue('firstname', result.memberData.first_name);
          form.setFieldValue('lastname', result.memberData.last_name);
          form.setFieldValue('phone', result.memberData.phone);
          form.setFieldValue('urgencyPhone', result.memberData.emergency_phone);
          const mappedGender = genderMap[result.memberData.gender as 'male' | 'female'];
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
    []
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

  const temporalityLabels: Record<string, string> = {
    season: 'Saison',
    yearly: 'Année',
    semester1: 'Semestre',
    quarter: 'Trimestre',
    month: 'Mois',
  };

  const audienceLabels: Record<string, string> = {
    adult: 'Adulte',
    reduced: 'Tarif réduit',
    teen: 'Ado',
    child: 'Enfant',
  };

  // Disabled field styling for returning members
  const disabledFieldClass = isReturningMember
    ? 'bg-gray-100 dark:bg-gray-800 cursor-not-allowed opacity-60'
    : '';

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

  const totalPrice = currentSubscription?.price || 0;

  // Computed variables for cleaner JSX conditionals
  const canShowBuilder = currentBirthday && !isUnderageUser;
  const canShowNoBirthdayMessage = !currentBirthday;
  const showSubmitWarning = !currentSubscription && currentBirthday && !isUnderageUser;
  const canSubmit = !isUnderageUser;
  const isSubmitDisabled = isSubmitting || !currentSubscription;
  const showReturningMemberBanner = isReturningMember && !submitSuccess;
  const showNewMemberInfo = !isReturningMember && !submitSuccess;
  const showTemporalitySelector = !!builderDiscipline;

  return (
    <>
      {/* Modal for underage users */}
      <UnderageModal show={showUnderageModal} onClose={closeModal} />

      <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
          Formulaire d'inscription
        </h2>

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
              i Ancien membre détecté - Veuillez vérifier vos informations et télécharger une
              nouvelle photo d'identité pour votre réinscription
            </p>
          </div>
        )}

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
            <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
                Votre abonnement
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {currentSubscription.disciplineName} -{' '}
                      {temporalityLabels[currentSubscription.duration] ||
                        currentSubscription.duration}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {audienceLabels[currentSubscription.audience] || currentSubscription.audience}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {currentSubscription.price}€
                  </span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-300 dark:border-purple-700">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Total:</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {totalPrice}€
                  </span>
                </div>
              </div>
            </div>
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
