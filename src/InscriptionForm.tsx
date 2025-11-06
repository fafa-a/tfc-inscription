import { useForm } from '@tanstack/react-form';
import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';
import { type Discipline, supabase } from './lib/supabase';

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
  discipline: z.string().min(1, 'Veuillez sélectionner une discipline'),
});

type FormData = z.infer<typeof formSchema>;

export default function InscriptionForm() {
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [isLoadingDisciplines, setIsLoadingDisciplines] = useState(true);

  useEffect(() => {
    const fetchDisciplines = async () => {
      const { data, error } = await supabase
        .from('disciplines')
        .select('id, name')
        .eq('active', true);

      if (error) {
        console.error('Error fetching disciplines:', error);
      } else if (data) {
        setDisciplines(data);
      }
      setIsLoadingDisciplines(false);
    };

    fetchDisciplines();
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
      discipline: '',
    },
    onSubmit: async ({ value }) => {
      console.log('Form submitted:', value);
      alert('Formulaire soumis avec succès!');
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

  const createBirthdayChangeHandler = useCallback(
    <T,>(handleChange: (value: T) => void, currentValue: string) =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatDateInput(e.target.value, currentValue);
        handleChange(formatted as T);
      },
    []
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 bg-gradient-to-r from-purple-600 to-purple-800 bg-clip-text text-transparent">
        Formulaire d'inscription
      </h2>

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
                onChange={createBirthdayChangeHandler(field.handleChange, field.state.value)}
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
              <label
                htmlFor="discipline"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Discipline sportive *
              </label>
              <select
                id="discipline"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={createSelectChangeHandler(field.handleChange)}
                disabled={isLoadingDisciplines}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">
                  {isLoadingDisciplines ? 'Chargement...' : 'Sélectionner...'}
                </option>
                {disciplines.map((discipline) => (
                  <option key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </option>
                ))}
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
            className="w-full px-6 py-3 text-base font-medium text-white bg-purple-600 hover:bg-purple-700 active:translate-y-0.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
          >
            S'inscrire
          </button>
        </div>
      </form>
    </div>
  );
}
