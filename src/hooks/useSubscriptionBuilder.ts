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

  const ageGroup: AgeGroup | null = useMemo(() => {
    if (!currentBirthday) return null;
    return getAgeGroupFromBirthday(currentBirthday);
  }, [currentBirthday]);

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
  }, []);

  const setBuilderTemporality = useCallback((type: string) => {
    setBuilderTemporalityState(type);
  }, []);

  const resetBuilder = useCallback(() => {
    setBuilderDisciplineState('');
    setBuilderTemporalityState('');
  }, []);

  const getSelectedPlan = useCallback((): SubscriptionPlan | null => {
    if (!builderDiscipline || !builderTemporality || !ageGroup) return null;

    return (
      subscriptionPlans.find(
        (plan) =>
          plan.discipline_id === builderDiscipline &&
          plan.type === builderTemporality &&
          (ageGroup === 'adulte'
            ? isReturningMember
              ? plan.audience === 'reduced'
              : plan.audience === 'adult'
            : false)
      ) || null
    );
  }, [builderDiscipline, builderTemporality, ageGroup, subscriptionPlans, isReturningMember]);

  return {
    builderDiscipline,
    builderTemporality,
    ageGroup,
    availableTemporalities,
    getSelectedPlan,
    setBuilderDiscipline,
    setBuilderTemporality,
    resetBuilder,
  };
}
