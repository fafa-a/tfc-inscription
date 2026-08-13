import { useEffect, useCallback } from 'react';

interface HelloAssoWidgetProps {
  checkoutUrl: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  onClose: () => void;
}

export const HelloAssoWidget: React.FC<HelloAssoWidgetProps> = ({
  checkoutUrl,
  onSuccess,
  onError,
  onClose,
}) => {
  const handleMessage = useCallback(
    (event: MessageEvent) => {
      if (event.origin !== 'https://www.helloasso.com' && event.origin !== 'https://www.helloasso-sandbox.com') {
        return;
      }

      const { type, data } = event.data || {};

      switch (type) {
        case 'helloasso:checkout:success':
          onSuccess();
          break;
        case 'helloasso:checkout:error':
          onError(data?.message || 'Erreur de paiement');
          break;
        case 'helloasso:checkout:close':
          onClose();
          break;
      }
    },
    [onSuccess, onError, onClose]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  return (
    <div className="w-full h-full min-h-[600px]">
      <iframe
        src={checkoutUrl}
        title="Paiement HelloAsso"
        className="w-full h-full min-h-[600px] border-0 rounded-md"
        allow="payment"
      />
    </div>
  );
};
