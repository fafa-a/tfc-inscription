import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';
import {
  type AgeGroup,
  type Discipline,
  type SubscriptionPlan,
  convertToISODate,
  insertMemberWithSubscription,
  supabase,
} from './lib/supabase';
import { getAgeGroupFromBirthday } from './utils/ageUtils';

// Utility function to format date input as DD/MM/YYYY
const formatDateInput = (value: string, previousValue: string): string => {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');

  // Limit to 8 digits (DDMMYYYY)
  const limitedDigits = digits.slice(0, 8);

  // Check if user is deleting (going backwards)
  const isDeleting = value.length < previousValue.length;

  // Add slashes at appropriate positions
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
  temporality: z.enum(['season', 'semester1', 'quarter', 'month', 'yearly'], {
    message: 'Veuillez sélectionner une temporalité',
  }),
  discipline: z.string().min(1, 'Veuillez sélectionner une discipline'),
  subscriptionPlan: z.string().min(1, 'Veuillez sélectionner une formule'),
});

type FormData = z.infer<typeof formSchema>;

export default function InscriptionForm() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [subscriptionPlans, setSubscriptionPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(true);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [currentBirthday, setCurrentBirthday] = useState('');
  const [currentTemporality, setCurrentTemporality] = useState('');
  const [currentDiscipline, setCurrentDiscipline] = useState('');

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
      setIsLoadingDisciplines(false);

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
      setIsLoadingPlans(false);
    };

    fetchData();
  }, []);

  const form = useForm({
    defaultValues: {
      firstname: '',
      lastname: '',
      birthday: '',
      genre: '' as FormData['genre'] | '',
      phone: '',
      urgencyPhone: '',
      email: '',
      temporality: '' as FormData['temporality'] | '',
      discipline: '',
      subscriptionPlan: '',
    },
    onSubmit: async ({ value }) => {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      try {
        const validated = formSchema.parse(value);

        // Convert birthday from DD/MM/YYYY to YYYY-MM-DD
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
          discipline_id: validated.discipline,
          notes: 'Inscription web',
        };

        const result = await insertMemberWithSubscription(memberData, validated.subscriptionPlan);

        if (!result.success) {
          throw new Error(result.error || "Erreur lors de l'inscription");
        }

        setSubmitSuccess(true);

        form.reset();
        setCurrentBirthday('');
        setCurrentTemporality('');
        setCurrentDiscipline('');
      } catch (error) {
        if (error instanceof z.ZodError) {
          setSubmitError('Veuillez vérifier tous les champs du formulaire');
        } else if (error instanceof Error) {
          setSubmitError(error.message);
        } else {
          setSubmitError("Une erreur est survenue lors de l'inscription");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
  });

  const ageGroup: AgeGroup | null = useMemo(() => {
    if (!currentBirthday) return null;
    return getAgeGroupFromBirthday(currentBirthday);
  }, [currentBirthday]);

  const filteredPlans = useMemo(() => {
    if (!currentBirthday || !currentTemporality || !currentDiscipline || !ageGroup) {
      return [];
    }

    const filtered = subscriptionPlans.filter((plan) => {
      const temporalityMatch = plan.type === currentTemporality;
      if (!temporalityMatch) return false;

      const disciplineMatch = plan.discipline_id === currentDiscipline;
      if (!disciplineMatch) return false;

      // Filter by age group (audience)
      let audienceMatch = false;
      if (ageGroup === 'enfant') {
        audienceMatch = plan.audience === 'child';
      } else if (ageGroup === 'ado') {
        audienceMatch = plan.audience === 'teen';
      } else {
        // adulte - match 'adult' and 'reduced' (students, etc.)
        audienceMatch = plan.audience === 'adult' || plan.audience === 'reduced';
      }

      return audienceMatch;
    });

    // Deduplicate by price and audience (in case of duplicate DB entries)
    const uniquePlans = filtered.reduce((acc, plan) => {
      const key = `${plan.price}-${plan.audience}`;
      if (!acc.has(key)) {
        acc.set(key, plan);
      }
      return acc;
    }, new Map<string, SubscriptionPlan>());

    return Array.from(uniquePlans.values());
  }, [currentBirthday, currentTemporality, currentDiscipline, ageGroup, subscriptionPlans]);

  const handleFormSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      e.stopPropagation();
      form.handleSubmit();
    },
    [form]
  );

  // Create stable change handlers
  // Using a generic type parameter to preserve TanStack Form's exact type
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

  // Birthday change handler with date formatting and state updates
  const handleBirthdayChange = useCallback(
    (fieldHandleChange: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const formatted = formatDateInput(e.target.value, form.getFieldValue('birthday'));
      fieldHandleChange(formatted);
      setCurrentBirthday(formatted);
      // Reset subscription plan when birthday changes (age group might change)
      form.setFieldValue('subscriptionPlan', '');
    },
    [form]
  );

  // Temporality change handler with state updates
  const handleTemporalityRadioChange = useCallback(
    (value: string) => {
      const temporalityValue = value as FormData['temporality'];
      form.setFieldValue('temporality', temporalityValue);
      setCurrentTemporality(value);
      // Reset subscription plan when temporality changes
      form.setFieldValue('subscriptionPlan', '');
    },
    [form]
  );

  // Discipline change handler with state updates
  const handleDisciplineRadioChange = useCallback(
    (value: string) => {
      form.setFieldValue('discipline', value);
      setCurrentDiscipline(value);
      // Reset subscription plan when discipline changes
      form.setFieldValue('subscriptionPlan', '');
    },
    [form]
  );

  // Get unique temporalities from subscription plans based on audience
  const availableTemporalities = useMemo(() => {
    const temporalityTypes = new Set<string>();

    subscriptionPlans.forEach((plan) => {
      // Map age group to audience
      if (ageGroup) {
        let audienceMatch = false;
        if (ageGroup === 'enfant') {
          audienceMatch = plan.audience === 'child';
        } else if (ageGroup === 'ado') {
          audienceMatch = plan.audience === 'teen';
        } else {
          // adulte - match 'adult' and 'reduced' (students, etc.)
          audienceMatch = plan.audience === 'adult' || plan.audience === 'reduced';
        }
        if (audienceMatch) {
          temporalityTypes.add(plan.type);
        }
      } else {
        // No birthday, show all temporalities
        temporalityTypes.add(plan.type);
      }
    });

    return Array.from(temporalityTypes);
  }, [ageGroup, subscriptionPlans]);

  // Get all active disciplines (not filtered by plans since all plans use same discipline_id)
  // We show all disciplines and filter plans when user selects
  const availableDisciplines = useMemo(() => {
    // Simply return all active disciplines
    return disciplines;
  }, [disciplines]);

  // Temporality labels for display
  const temporalityLabels: Record<string, string> = {
    season: 'Saison complète',
    yearly: 'Année',
    semester1: 'Semestre',
    quarter: 'Trimestre',
    month: 'Mois',
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
        Formulaire d'inscription
      </h2>

      {/* Success Message */}
      {submitSuccess && (
        <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✓ Inscription réussie ! Votre demande a été enregistrée.
          </p>
        </div>
      )}

      {/* Error Message */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-800 dark:text-red-200 font-medium">✗ {submitError}</p>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-4">
        {/* Firstname */}
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

        {/* Lastname */}
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

        {/* Birthday */}
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

        {/* Genre */}
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
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
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

        {/* Phone */}
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

        {/* Urgency Phone */}
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

        {/* Email */}
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

        {/* Temporality */}
        <form.Field
          name="temporality"
          validators={{
            onChange: ({ value }) => {
              const result = formSchema.shape.temporality.safeParse(value);
              if (!result.success) {
                return result.error.issues[0]?.message;
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <div>
              <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Temporalité *
              </div>
              {isLoadingPlans && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Chargement des temporalités...
                </p>
              )}
              <div className="space-y-2">
                {availableTemporalities.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {subscriptionPlans.length === 0
                      ? 'Aucun plan disponible dans la base de données'
                      : 'Aucune temporalité disponible'}
                  </p>
                ) : (
                  availableTemporalities.map((type) => (
                    <label
                      key={type}
                      className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="radio"
                        name="temporality"
                        value={type}
                        checked={field.state.value === type}
                        onChange={(e) => handleTemporalityRadioChange(e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="ml-3 text-gray-700 dark:text-gray-300">
                        {temporalityLabels[type] || type}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Discipline */}
        <form.Field
          name="discipline"
          validators={{
            onChange: ({ value }) => {
              const result = formSchema.shape.discipline.safeParse(value);
              if (!result.success) {
                return result.error.issues[0]?.message;
              }
              return undefined;
            },
          }}
        >
          {(field) => (
            <div>
              <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Discipline sportive *
              </div>
              <div className="space-y-2">
                {isLoadingDisciplines ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">Chargement...</p>
                ) : availableDisciplines.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {disciplines.length === 0
                      ? 'Aucune discipline dans la base de données'
                      : subscriptionPlans.length === 0
                        ? 'Aucun plan disponible dans la base de données'
                        : 'Aucune discipline disponible'}
                  </p>
                ) : (
                  availableDisciplines.map((discipline) => (
                    <label
                      key={discipline.id}
                      className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <input
                        type="radio"
                        name="discipline"
                        value={discipline.id}
                        checked={field.state.value === discipline.id}
                        disabled={isLoadingDisciplines}
                        onChange={(e) => handleDisciplineRadioChange(e.target.value)}
                        className="w-4 h-4 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                      />
                      <span className="ml-3 text-gray-700 dark:text-gray-300">
                        {discipline.name}
                      </span>
                    </label>
                  ))
                )}
              </div>
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Subscription Plan */}
        <form.Field
          name="subscriptionPlan"
          validators={{
            onChange: ({ value }) => {
              const result = formSchema.shape.subscriptionPlan.safeParse(value);
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
                htmlFor="subscriptionPlan"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Formule d'abonnement *
                {currentTemporality && (
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {' '}
                    ({temporalityLabels[currentTemporality]})
                  </span>
                )}
                {currentDiscipline && (
                  <span className="text-gray-500 dark:text-gray-400 font-normal">
                    {' '}
                    - {disciplines.find((d) => d.id === currentDiscipline)?.name}
                  </span>
                )}
              </label>
              {!currentBirthday && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Veuillez renseigner votre date de naissance
                </p>
              )}
              {!currentTemporality && currentBirthday && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Veuillez sélectionner une temporalité
                </p>
              )}
              {!currentDiscipline && currentTemporality && currentBirthday && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                  Veuillez sélectionner une discipline
                </p>
              )}
              <select
                id="subscriptionPlan"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={createSelectChangeHandler(field.handleChange)}
                disabled={
                  isLoadingPlans || !currentBirthday || !currentTemporality || !currentDiscipline
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingPlans
                    ? 'Chargement...'
                    : filteredPlans.length === 0
                      ? 'Aucune formule disponible'
                      : 'Sélectionner...'}
                </option>
                {filteredPlans.map((plan) => {
                  const audienceLabel =
                    plan.audience === 'reduced'
                      ? "Tarif réduit (Étudiants/Forces de l'ordre/Anciens adhérents)"
                      : plan.audience === 'adult'
                        ? 'Tarif normal'
                        : '';
                  return (
                    <option key={plan.id} value={plan.id}>
                      {plan.price}€ - {audienceLabel}
                    </option>
                  );
                })}
              </select>
              {field.state.meta.errors.length > 0 && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  {field.state.meta.errors.join(', ')}
                </p>
              )}
            </div>
          )}
        </form.Field>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-6 py-3 text-base font-medium text-white bg-purple-600 hover:bg-purple-700 active:translate-y-0.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:translate-y-0"
          >
            {isSubmitting ? 'Inscription en cours...' : "S'inscrire"}
          </button>
        </div>
      </form>
    </div>
  );
}
