import type { Discipline, SubscriptionPlan } from '../lib/supabase';

interface SubscriptionBuilderSectionProps {
  disciplines: Discipline[];
  builderDiscipline: string;
  builderTemporality: string;
  builderSelectedPlans: string[];
  availableTemporalities: string[];
  filteredPlans: SubscriptionPlan[];
  showTemporalitySelector: boolean;
  showPlanSelector: boolean;
  showAddButton: boolean;
  showNoPlansMessage: boolean;
  handleDisciplineChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleTemporalityChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePlanCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleAddSubscriptions: () => void;
}

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

export function SubscriptionBuilderSection({
  disciplines,
  builderDiscipline,
  builderTemporality,
  builderSelectedPlans,
  availableTemporalities,
  filteredPlans,
  showTemporalitySelector,
  showPlanSelector,
  showAddButton,
  showNoPlansMessage,
  handleDisciplineChange,
  handleTemporalityChange,
  handlePlanCheckboxChange,
  handleAddSubscriptions,
}: SubscriptionBuilderSectionProps) {
  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
        Ajouter un abonnement
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

      {/* Plan Selection */}
      {showPlanSelector && (
        <div className="mb-4">
          <div className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Formule *
          </div>
          <div className="space-y-2">
            {filteredPlans.map((plan) => (
              <label
                key={plan.id}
                className="flex items-start p-3 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <input
                  type="checkbox"
                  data-plan-id={plan.id}
                  checked={builderSelectedPlans.includes(plan.id)}
                  onChange={handlePlanCheckboxChange}
                  className="mt-1 w-4 h-4 text-purple-600 focus:ring-purple-500 rounded"
                />
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {audienceLabels[plan.audience] || plan.audience}
                    </span>
                    <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                      {plan.price}€
                    </span>
                  </div>
                  {plan.audience === 'reduced' && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      (Étudiants/Forces de l'ordre/Anciens adhérents)
                    </p>
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Add Button */}
      {showAddButton && (
        <button
          type="button"
          onClick={handleAddSubscriptions}
          className="w-full px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          + Ajouter à mes abonnements ({builderSelectedPlans.length})
        </button>
      )}

      {showNoPlansMessage && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Aucune formule disponible pour cette sélection
        </p>
      )}
    </div>
  );
}
