interface SubscriptionSummaryProps {
  disciplineName: string;
  duration: string;
  audience: string;
  price: number;
  totalPrice: number;
}

export function SubscriptionSummary({
  disciplineName,
  duration,
  audience,
  price,
  totalPrice,
}: SubscriptionSummaryProps) {
  return (
    <div className="border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4 bg-purple-50 dark:bg-purple-900/20">
      <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-3">
        Votre abonnement
      </h3>
      <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex-1">
          <p className="font-medium text-gray-900 dark:text-gray-100">
            {disciplineName} - {duration}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">{audience}</p>
        </div>
        <span className="text-lg font-bold text-purple-600 dark:text-purple-400">{price}€</span>
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
  );
}
