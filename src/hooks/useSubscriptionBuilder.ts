import { useCallback, useMemo, useState } from 'react';
import type { AgeGroup, SubscriptionPlan } from '../lib/supabase';
import { getAgeGroupFromBirthday } from '../utils/ageUtils';

interface UseSubscriptionBuilderProps {
  currentBirthday: string;
  isReturningMember: boolean;
  subscriptionPlans: SubscriptionPlan[];
}

export function useSubscriptionBuilder({
  currentBirthday,
  isReturningMember,
  subscriptionPlans,
}: UseSubscriptionBuilderProps) {
  const [builderDiscipline, setBuilderDisciplineState] = useState('');
  const [builderTemporality, setBuilderTemporalityState] = useState('');
  const [builderSelectedPlans, setBuilderSelectedPlans] = useState<string[]>([]);

  const ageGroup: AgeGroup | null = useMemo(() => {
    if (!currentBirthday) return null;
    return getAgeGroupFromBirthday(currentBirthday);
  }, [currentBirthday]);

  const filteredPlans = useMemo(() => {
    if (!currentBirthday || !ageGroup || !builderDiscipline || !builderTemporality) {
      return [];
    }

    return subscriptionPlans.filter((plan) => {
      // Match discipline
      if (plan.discipline_id !== builderDiscipline) return false;

      // Match temporality
      if (plan.type !== builderTemporality) return false;

      // ADULTS ONLY - Active policy
      if (ageGroup === 'adulte') {
        return isReturningMember ? plan.audience === 'reduced' : plan.audience === 'adult';
      }

      return false;
    });
  }, [
    currentBirthday,
    ageGroup,
    builderDiscipline,
    builderTemporality,
    subscriptionPlans,
    isReturningMember,
  ]);

  const availableTemporalities = useMemo(() => {
    if (!currentBirthday || !ageGroup || !builderDiscipline) {
      return [];
    }

    const temporalitySet = new Set<string>();

    subscriptionPlans.forEach((plan) => {
      if (plan.discipline_id !== builderDiscipline) return;

      // ADULTS ONLY - Active policy
      const audienceMatch =
        ageGroup === 'adulte'
          ? isReturningMember
            ? plan.audience === 'reduced'
            : plan.audience === 'adult'
          : false;

      if (audienceMatch) {
        temporalitySet.add(plan.type);
      }
    });

    return Array.from(temporalitySet);
  }, [currentBirthday, ageGroup, builderDiscipline, subscriptionPlans, isReturningMember]);

  const setBuilderDiscipline = useCallback((id: string) => {
    setBuilderDisciplineState(id);
    setBuilderTemporalityState('');
    setBuilderSelectedPlans([]);
  }, []);

  const setBuilderTemporality = useCallback((type: string) => {
    setBuilderTemporalityState(type);
    setBuilderSelectedPlans([]);
  }, []);

  const togglePlan = useCallback((planId: string) => {
    setBuilderSelectedPlans((prev) =>
      prev.includes(planId) ? prev.filter((id) => id !== planId) : [...prev, planId]
    );
  }, []);

  const resetBuilder = useCallback(() => {
    setBuilderDisciplineState('');
    setBuilderTemporalityState('');
    setBuilderSelectedPlans([]);
  }, []);

  return {
    builderDiscipline,
    builderTemporality,
    builderSelectedPlans,
    ageGroup,
    availableTemporalities,
    filteredPlans,
    setBuilderDiscipline,
    setBuilderTemporality,
    togglePlan,
    resetBuilder,
  };
}
