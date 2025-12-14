import type { Discipline } from '../lib/supabase';

interface SubscriptionBuilderSectionProps {
  disciplines: Discipline[];
  builderDiscipline: string;
  builderTemporality: string;
  availableTemporalities: string[];
  showTemporalitySelector: boolean;
  handleDisciplineChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTemporalityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const temporalityLabels: Record<string, string> = {
  season: 'Saison',
  yearly: 'Année',
  semester1: 'Semestre',
  quarter: 'Trimestre',
  month: 'Mois',
};

export function SubscriptionBuilderSection({
  disciplines,
  builderDiscipline,
  builderTemporality,
  availableTemporalities,
  showTemporalitySelector,
  handleDisciplineChange,
  handleTemporalityChange,
}: SubscriptionBuilderSectionProps) {
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Choisir un abonnement
      </h3>

      {/* Discipline Selection */}
      <div className="mb-4">
        <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Discipline *
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {disciplines.map((discipline) => (
            <label
              key={discipline.id}
              className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <input
                type="radio"
                name="builderDiscipline"
                value={discipline.id}
                checked={builderDiscipline === discipline.id}
                onChange={handleDisciplineChange}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <span className="ml-3 text-gray-700 dark:text-gray-300">{discipline.name}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Temporality Selection */}
      {showTemporalitySelector && (
        <div className="mb-4">
          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Durée *
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableTemporalities.map((type) => (
              <label
                key={type}
                className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="radio"
                  name="builderTemporality"
                  value={type}
                  checked={builderTemporality === type}
                  onChange={handleTemporalityChange}
                  className="w-4 h-4 text-purple-600 focus:ring-purple-500"
                />
                <span className="ml-3 text-gray-700 dark:text-gray-300">
                  {temporalityLabels[type] || type}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
